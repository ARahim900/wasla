-- ============================================================
-- INVOICE METRICS AGGREGATION (server-side)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
--
-- Why: the Dashboard and Invoices pages computed revenue / outstanding /
-- overdue by fetching invoice rows and summing in the browser. PostgREST caps
-- a request at 1000 rows, so past ~1000 invoices those money figures were
-- silently computed over a partial set. This function does the aggregation in
-- Postgres so the totals stay correct at any scale, in a single round-trip and
-- with no row data transferred.
--
-- SECURITY INVOKER (the default): the function runs with the caller's
-- privileges, so RLS on `invoices` still applies — an authenticated user
-- aggregates exactly the rows they may see (all of them, in the shared
-- workspace). Safe to re-run.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_invoice_metrics()
RETURNS TABLE (
  revenue_ytd       numeric,
  overdue_count     bigint,
  total_billed      numeric,
  total_paid        numeric,
  total_outstanding numeric
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    -- Revenue this calendar year: paid invoices issued in the current year.
    COALESCE(SUM(total) FILTER (
      WHERE status = 'paid'
        AND issue_date IS NOT NULL
        AND date_part('year', issue_date) = date_part('year', CURRENT_DATE)
    ), 0)::numeric AS revenue_ytd,
    -- Overdue: billed-but-unpaid (not draft/cancelled/paid) past its due date.
    COUNT(*) FILTER (
      WHERE status NOT IN ('paid', 'cancelled', 'draft')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    ) AS overdue_count,
    -- Billed revenue: everything except drafts and cancelled invoices.
    COALESCE(SUM(total) FILTER (WHERE status NOT IN ('draft', 'cancelled')), 0)::numeric AS total_billed,
    COALESCE(SUM(total) FILTER (WHERE status = 'paid'), 0)::numeric AS total_paid,
    -- Outstanding: billed but not yet paid.
    COALESCE(SUM(total) FILTER (WHERE status NOT IN ('draft', 'cancelled', 'paid')), 0)::numeric AS total_outstanding
  FROM public.invoices;
$$;

-- Expose it to logged-in users only (RPC is called with the anon/authenticated
-- key from the browser; anon has no SELECT policy on invoices anyway).
REVOKE ALL ON FUNCTION public.get_invoice_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invoice_metrics() TO authenticated;

-- ============================================================
-- DONE. The app calls this via supabase.rpc('get_invoice_metrics'). Until this
-- is applied it transparently falls back to the previous client-side sum, so
-- deploying the code before running this migration does not break anything.
-- ============================================================
