# Wasla — Production Readiness Audit

**Date:** 2026-06-12 · **Commit:** `698f71d` (main) · **Method:** 4 parallel section audits + build/lint verification

## Executive Summary

**Verdict: NOT production-ready yet — but close.** The foundations are unusually solid (auth lifecycle, pricing, data-layer error handling, build health). What blocks ship is a concentrated set of fixable issues: a broken invoicing module, a concurrent-edit data-loss path in the core inspection form, dev tooling shipping to production, a deleted PWA manifest, and a customer-facing report that prints the wrong date. Estimated effort to shippable: **2–4 focused days.**

| Section | Verdict | Blockers |
|---------|---------|----------|
| Auth, routing & app shell | 🟡 Close | VisualEditAgent in prod, demo-mode fail-open, no security headers |
| Inspection workflow (core) | 🔴 Not ready | Concurrent-edit clobber, offline data loss, report date/ref, XSS |
| Business mgmt (Dashboard/Clients/Properties/Invoices/Settings) | 🔴 Not ready | Invoicing module (manual items impossible; paid invoices mutate) |
| Infra, security & deployment | 🟡 Close | Missing manifest, headers, fail-open env |
| Build & lint | ✅ Green | — |

---

## CRITICAL — must fix before real client use

### C1. Invoicing cannot serve as a system of record
- **Manual invoices are impossible.** Line items render as `disabled` inputs with no "Add item" control (`src/pages/InvoiceForm.jsx:320–338`), despite the empty state promising manual items (line 342). Submission is blocked without items (lines 184–191). Ad-hoc billing, discounts, fees, re-issues: all impossible.
- **Saved/paid invoices silently recalculate.** The auto-populate effect (`InvoiceForm.jsx:88–173`) runs for existing invoices, rebuilding amounts from *current* property data and rates. If area/rates changed since issuance, the UI shows — and Save persists — different numbers than what was billed. If the linked inspection lost its area/type, items are wiped to zero.
- **No edit-after-paid guard.** Status freely flips paid → draft (lines 304–314); every field of a paid invoice is editable.

### C2. Autosave is last-writer-wins — concurrent edits silently destroy work
`src/pages/InspectionForm.jsx:212–213` writes the entire payload (full `areas` JSONB) every 2.5s with no version/`updated_at` conflict check. Two tabs, or two inspectors on one job (open-workspace RLS makes this likely), silently overwrite each other's grades, items, and photo lists. The manual-save path (line 421) has the same flaw. Realtime is enabled in the DB but never subscribed.

---

## HIGH

### H1. Dev/sandbox tooling ships to production; no frame protection
- `VisualEditAgent` is mounted unconditionally (`src/App.jsx:128`) and its origin check is commented out (`src/lib/VisualEditAgent.jsx:414–416`). Any site that iframes waslapro.vercel.app can rewrite DOM text, force reloads, and read clicked elements' text inside an authenticated session.
- `NavigationTracker.jsx:13–21` posts `window.location.href` to any parent with `'*'` — including the Supabase recovery `access_token` hash on password-reset links.
- `vercel.json` has **no headers block** (no `frame-ancestors`/`X-Frame-Options`/CSP), which is what makes the above exploitable.
- **Fix:** gate both components behind `import.meta.env.DEV`; add security headers to `vercel.json`.

### H2. PWA manifest deleted; no offline story for field inspectors
- `index.html:10` links `/manifest.json`, but the file was deleted by unrelated commit `7c87c73` — 404 on every load; Add-to-Home-Screen broken. Recoverable verbatim from commit `440db29`.
- No service worker, no `beforeunload` guard, no local draft cache: after a failed autosave, closing the tab silently discards everything since the last success (the only signal is small grey text, `InspectionForm.jsx:647–649`). Failed autosaves don't retry on reconnect. Photo uploads fail hard offline with no queue.

### H3. Misconfigured deploys silently become a fake app (demo-mode fail-open)
If `VITE_SUPABASE_URL` is unset at build time, production auto-authenticates everyone as a demo admin against localStorage (`src/lib/AuthContext.jsx:61–74`, `src/lib/supabase.js:12–14`, `isDemoMode` copy-pasted in 3 files). Production builds should throw at startup instead.

### H4. The customer-facing report prints the wrong date and an unstable reference
`htmlReportGenerator.jsx:126–127` uses `Date.now()` for the report ref and *today* for the date — `inspection_date` is passed in but ignored. Printing the same inspection twice yields two refs and two dates on an official document.

### H5. Stored XSS in the report iframe
`htmlReportGenerator.jsx:1615` interpolates `photo.url` unescaped — the only interpolation that bypasses `escapeHTML()`. The report renders via same-origin `srcDoc` with no `sandbox` (`InspectionReport.jsx:152–157`); injected script runs with the viewer's Supabase session. Any workspace member can write `areas` JSONB. **Fix:** escape the URL + add `sandbox` to the iframe.

### H6. One critical (E) defect can still print a green "AA" cover grade
Overall grade is a volume-diluted mean (`htmlReportGenerator.jsx:211–219`): 9×A + 1×E = "AA" in green. Cap/flag the overall grade when any D/E exists. Also the overall scale (AAA–D) is a different alphabet than the item scale (A–E) — confusing on one page.

### H7. Failed data loads masquerade as empty states
Clients/Properties/Invoices use per-entity `.catch(() => [])`, making the error toast unreachable — a Supabase outage shows "No clients found — add your first client." Dashboard does it correctly (`allSettled` + toasts); match it. (`Clients.jsx:31–38`, `Properties.jsx:30–37`, `Invoices.jsx:33–36`)

### H8. Client deletion destroys invoice identity
FKs are `ON DELETE SET NULL` and invoices store no client snapshot — deleting a client turns paid invoices into "Unknown Client" permanently. The confirm dialog gives no warning about unlinking.

### H9. Financial metrics are wrong
"Outstanding" counts drafts **and cancelled** invoices as money owed; "Total Revenue" sums them too, and both shift meaning when a filter is active (`Invoices.jsx:83–94`).

### H10. Inspection photos are publicly readable by anonymous users
`supabase/schema.sql:403–405, 442–445`: public bucket + explicit `TO anon` SELECT. Beyond the accepted authenticated-open-workspace model — anyone with a URL can view clients' home interiors, forever. Fast-follow: private bucket + signed URLs.

---

## MEDIUM (selected)

- **No global error boundary / telemetry** — render exception = white screen mid-inspection; StrictMode commented out (`main.jsx:7–9`).
- **Unbounded queries** — every list pulls whole tables with `select('*')` incl. heavy `areas` JSONB; Supabase silently caps at 1000 rows. Client-side-only pagination/search.
- **Mobile regressions in the core form** — InspectionForm overrides correct base components down to 40px/14px (`h-10 text-sm`, lines 501–593), triggering iOS focus-zoom and violating the project's own ≥44px/≥16px spec. Photo remove button is 32px.
- **Delete flow** — photos destroyed *before* the row; `DeleteFile` swallows all errors so the failure toast can never fire (`integrations.js:77–91`); orphans accumulate silently.
- **HEIC photos** fail late with a generic error (bucket rejects; compressor falls back to original on decode failure). PNG transparency becomes black.
- **Report findings page is exception-only** but labeled with totals; a clean inspection produces an empty findings page that looks broken.
- **No DB CHECK constraints** behind unvalidated autosave (status/type/area unconstrained); every keystroke on a new form creates a real `scheduled` row — abandoned drafts pollute the list.
- **Status transitions unguarded** — anything → anything; zero-item inspections can be "completed"; the form has no status control at all.
- **Manual save can hang forever** — busy-wait loop with no timeout (`InspectionForm.jsx:390–392`).
- **Overdue boundary bugs** — invoices flagged overdue *on* the due date; Dashboard and Invoices disagree on whether drafts count.
- **No duplicate protection** — clients by email, invoice numbers across users (unique only per-user while workspace is shared).
- **Placebo settings** — notification toggles persist but nothing consumes them; tax rate has no input.
- **Deep links discarded on login** — always lands on Dashboard (`Login.jsx:83`).
- **Logo hot-linked** from a third-party Base44 Supabase bucket in 4 places — breaks everywhere if that bucket is cleaned; move to `/public`.

## LOW (selected)

- 6 unused heavy deps (`three`, `react-leaflet`, `react-quill` → pins `quill@1.3.7` with known XSS advisories, `react-markdown`, `canvas-confetti`, `@hello-pangea/dnd`).
- `prefers-reduced-motion` not respected; render-blocking Google Fonts contradict the "system fonts" spec.
- Dashboard OMR shown with 1 decimal (currency is 3-dp); search misses `property_address` (the card title); UTC default dates shift before 4 a.m. Oman time; grading logic duplicated in two files; `recommendations` column read but doesn't exist in schema; dead files (`Home.jsx`, `UserNotRegisteredError.jsx`, divergent `EnhancedPDFExportButton`); `INV-${Date.now()}` invoice numbers; 6-char password minimum; login email not trimmed; console noise (86 occurrences, no build stripping).

---

## What is genuinely solid

- **Auth core** — deadlock-safe listener, idempotent logout, token refresh, fallback profile; the password-recovery flow is the best-engineered part of the app.
- **Pricing** — single source of truth (`src/lib/pricing.js`: Villa 1.000 / Apartment 0.700 / Office 1.000 / Building 1.000 OMR/m²), guarded inputs, consumed consistently by form preview and invoice auto-fill.
- **Data layer** — every Supabase call checks `.error` with context; `allSettled` batch accounting; storage *write* policies correctly folder-scoped with MIME/size limits.
- **Secrets hygiene** — nothing leaked in 59 commits; only anon key referenced.
- **Build** — green in 14.7s, all 11 routes lazy-loaded, sensible chunks (~143 KB entry); lint: 0 errors.
- **Grading core** — correct normalization, N/A handling, explicit-grade-over-inference.
- **Photo pipeline fundamentals** — quality-stepped compression, concurrency limits, objectURL cleanup, RLS-aligned paths.
- **A11y baseline** — labels, `aria-invalid`/`role="alert"`, ≥44px nav targets, letter grades not color-alone, skip links, safe-area handling.

---

## Recommended fix plan

**P0 — before any real client use (≈2 days):**
1. Escape `photo.url` + `sandbox` the report iframe (minutes)
2. Restore `public/manifest.json` from `440db29` (minutes)
3. Dev-gate `VisualEditAgent`/`NavigationTracker`; add security headers to `vercel.json` (~1h)
4. Fail fast on missing Supabase env in prod builds (~30m)
5. Report: use `inspection_date` + persist a stable report ref (~1h)
6. Invoice immutability: stop recomputing existing invoices; lock paid ones (~2h)
7. Manual line items in InvoiceForm (~3h)
8. Optimistic concurrency on autosave via `updated_at` (~3h)
9. `beforeunload` guard + localStorage draft cache (~3h)
10. Cap overall grade on any D/E (~1h)
11. Fix error-as-empty-state on 3 list pages (~1h)
12. Global error boundary (~1h)

**P1 — fast follows (≈1–2 days):** private photo bucket + signed URLs, financial metrics fix, client-deletion warning/snapshot, mobile touch-target regressions, delete-flow ordering, server-side pagination, status-transition guards, DB CHECK constraints, remove unused deps, local logo asset.
