-- ============================================================
-- REGISTRATION ALLOWLIST + STORAGE DELETE ALIGNMENT
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor).
--
-- Purpose: the workspace intentionally shares all business data across every
-- authenticated user, but sign-up was open to anyone on the internet — so any
-- stranger could register and read/modify/delete all client data. This closes
-- that hole by gating *who may create an account* to an explicit allowlist that
-- the team manages in-app (Settings > Team Access), without changing the
-- shared-workspace model for people who are on the team.
--
-- Safe to re-run (idempotent). Applying it does NOT sign anyone out or delete
-- any data; existing users are seeded into the allowlist automatically.
-- ============================================================

-- ------------------------------------------------------------
-- 1. ALLOWLIST TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.allowed_emails (
  email      TEXT PRIMARY KEY,
  added_by   UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Store/compare emails case-insensitively.
CREATE OR REPLACE FUNCTION public.lowercase_allowed_email()
RETURNS TRIGGER AS $$
BEGIN
  NEW.email = lower(trim(NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS lowercase_allowed_email_trigger ON public.allowed_emails;
CREATE TRIGGER lowercase_allowed_email_trigger
  BEFORE INSERT OR UPDATE ON public.allowed_emails
  FOR EACH ROW EXECUTE FUNCTION public.lowercase_allowed_email();

-- Seed every existing user so no current teammate is locked out.
INSERT INTO public.allowed_emails (email)
SELECT lower(email) FROM auth.users WHERE email IS NOT NULL
ON CONFLICT (email) DO NOTHING;

-- RLS: shared workspace — any authenticated teammate can view/manage the list.
ALTER TABLE public.allowed_emails ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can view allowed_emails" ON public.allowed_emails;
CREATE POLICY "Authenticated can view allowed_emails"
  ON public.allowed_emails FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated can insert allowed_emails" ON public.allowed_emails;
CREATE POLICY "Authenticated can insert allowed_emails"
  ON public.allowed_emails FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can delete allowed_emails" ON public.allowed_emails;
CREATE POLICY "Authenticated can delete allowed_emails"
  ON public.allowed_emails FOR DELETE TO authenticated USING (true);

-- ------------------------------------------------------------
-- 2. ENFORCE THE ALLOWLIST ON SIGN-UP
--    BEFORE INSERT on auth.users rejects any email not on the list.
--    SECURITY DEFINER so it can read allowed_emails while the new user is
--    still unauthenticated. Empty-list bootstrap allows the very first account.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_allowed_email()
RETURNS TRIGGER AS $$
BEGIN
  -- No empty-table bypass: an empty allowlist must block ALL registration, not
  -- open it (otherwise deleting the last entry would silently reopen sign-up).
  -- Bootstrapping is handled by seeding existing users above; on a brand-new
  -- project, insert the first admin email into allowed_emails BEFORE creating
  -- that user. (This trigger also fires for Dashboard/Admin-created users, so
  -- creating a user there does not bypass the allowlist.)
  IF EXISTS (
    SELECT 1 FROM public.allowed_emails
    WHERE email = lower(trim(NEW.email))
  ) THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'not_allowlisted: this email is not authorized to register'
    USING ERRCODE = 'check_violation';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS enforce_allowed_email_trigger ON auth.users;
CREATE TRIGGER enforce_allowed_email_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_allowed_email();

-- ------------------------------------------------------------
-- 3. ALIGN STORAGE DELETE WITH THE SHARED-WORKSPACE MODEL
--    The inspections table lets any authenticated user delete any inspection,
--    but the storage DELETE policy was owner-scoped — so deleting someone
--    else's inspection left its photo files orphaned in the bucket forever.
--    Make photo deletion match: any authenticated user may delete photos in
--    the inspection-photos bucket. (INSERT stays owner-scoped: files still
--    land under {user_id}/... so uploads remain attributable.)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Users can delete own photos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete inspection photos" ON storage.objects;
CREATE POLICY "Authenticated can delete inspection photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'inspection-photos');

-- ------------------------------------------------------------
-- 4. OPTIONAL HARDENING — review before enabling
-- ------------------------------------------------------------

-- 4a. Private photo bucket + signed URLs (finding H-01).
--     The inspection-photos bucket is currently PUBLIC and anonymously
--     readable. That is what lets photos load inside reports shared with
--     clients who are not logged in. Making the bucket private closes the
--     public-URL exposure but REQUIRES the app to generate signed URLs (with
--     an expiry) wherever report photos are rendered — otherwise existing
--     shared report links break. Do NOT run this until that app change ships.
--
-- UPDATE storage.buckets SET public = false WHERE id = 'inspection-photos';
-- DROP POLICY IF EXISTS "Public can view photos" ON storage.objects;

-- 4b. Status/type CHECK constraints (finding L-07). Enable once you've
--     confirmed no legacy rows violate them (the SELECTs return zero rows).
--
-- SELECT DISTINCT status FROM inspections
--   WHERE status NOT IN ('scheduled','in_progress','completed','cancelled');
-- ALTER TABLE inspections
--   ADD CONSTRAINT inspections_status_check
--   CHECK (status IN ('scheduled','in_progress','completed','cancelled'));
--
-- SELECT DISTINCT status FROM invoices
--   WHERE status NOT IN ('draft','sent','paid','overdue','cancelled');
-- ALTER TABLE invoices
--   ADD CONSTRAINT invoices_status_check
--   CHECK (status IN ('draft','sent','paid','overdue','cancelled'));

-- ============================================================
-- DONE. Also disable "Allow new users to sign up" in
-- Dashboard > Authentication > Providers > Email if you want a second layer,
-- but the allowlist above is enforced regardless of that toggle.
-- ============================================================
