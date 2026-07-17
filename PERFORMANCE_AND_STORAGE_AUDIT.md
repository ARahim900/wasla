# Wasla — Application Performance & Supabase Storage Audit

**Date:** 17 July 2026
**Scope:** Full application review (front end, data layer, Supabase schema/policies, deployment) plus backend storage integrity and capacity assessment.
**Method:** Read-only. No code, configuration, or database changes were made. Every finding below was verified by reading the code at the cited location, by running the standard quality gates (`npm ci`, `npm run build`, `npm run lint`, `tsc`), or by live checks against production infrastructure (Vercel API, deployed site, keep-alive endpoint, Supabase documentation). Items that could **not** be verified with the access available in this session are explicitly labelled as such.

---

## 1. Executive Summary

The application is **functionally healthy in production**:

- `waslapro.vercel.app` serves HTTP 200 with correct security headers; the production deployment is current with `main` (commit `807463e`, deployed 12 June 2026).
- **Zero serverless runtime errors** in the last 7 days (Vercel error clusters, checked live).
- The daily keep-alive cron works: a live invocation on 17 July 2026 (16:35 UTC) returned `"Database pinged successfully"`, confirming the production Supabase database is up and responding.
- Local build, ESLint, and typecheck gates all pass cleanly (with caveats — see M-09).
- The photo upload pipeline is well designed at the client level: images are compressed before upload (max 2048 px, stepped JPEG quality targeting ~1.2 MB), validated after compression, uploaded with collision-safe per-user paths, and stored as URLs (never base64) in the database.
- Most items from the two previous audits (`PRODUCTION_READINESS_AUDIT.md`, `QA_AUDIT.md`) are confirmed **fixed** in the current code (autosave concurrency, report XSS/iframe sandboxing, env fail-fast, error surfacing, invoice integrity, and more).

However, the audit found **one critical access-control issue, four high-priority issues, and a set of medium/low items**, summarised in §3. The most important:

1. **(Critical)** Sign-up is open to anyone, and the shared-workspace RLS model grants every authenticated user full read/write/delete over all business data. Combined, any member of the public who registers an account can read, alter, or erase every client record, inspection, and invoice.
2. **(High)** The inspection-photos bucket is public and anonymously readable — interior photos of clients' properties are world-viewable by URL.
3. **(High)** The 369 KB recharts library (~102 KB gzip — 37 % of the initial JavaScript) is downloaded on *every* first page load, including the login screen, to draw a single pie chart.
4. **(High)** Every list screen downloads entire tables with no server-side limit; results silently cap at 1,000 rows, after which data disappears from the UI and dashboard KPIs undercount.
5. **(High)** The fix for the mobile report **Print button** (dead on phones) has been sitting un-merged in draft **PR #15 since 15 June** — production field users still have the broken behaviour.

**Storage:** exact production byte counts could not be read this session (see §4 access note), but the capacity model built from verified code parameters shows the **Free-plan 1 GB storage ceiling is the binding constraint** — roughly 850–3,000 photos (≈ 30–100 photo-heavy inspections) — and two verified bugs cause storage to **only ever grow** (orphaned files are guaranteed in several flows and never cleaned up).

---

## 2. Access & Verification Boundaries (read first)

| Area | Status |
|---|---|
| Repository code, schema, migrations | **Fully verified** (every cited file read) |
| Build/lint/typecheck | **Verified** — run in this session; outputs quoted in §3 |
| Vercel project, deployments, build logs, runtime errors | **Verified live** via Vercel API |
| Production site availability & headers | **Verified live** (fetched through Vercel) |
| Production DB reachability | **Verified live** via `/api/keep-alive` (success, 17 Jul 2026 16:35 UTC) |
| Production DB contents / row counts / actual storage bytes | **Not verifiable this session.** The Wasla production Supabase project belongs to the `waslapro@outlook.com` account (per `supabase/schema.sql` header). The Supabase connector in this session is linked to a different account whose two projects (`muscatbaay@gmail.com` — the Muscat Bay operations DB — and an inactive `personal-finance` project) were inspected and confirmed **not** to contain the Wasla schema or the `inspection-photos` bucket. Direct HTTPS calls to `*.supabase.co` are also blocked by this environment's network policy. §4.4 provides ready-to-run SQL so these numbers can be captured in minutes. |
| Supabase plan limits | **Verified** against live Supabase documentation (fetched 17 Jul 2026) |
| Supabase Auth dashboard settings (signup enabled? email confirmation?) | **Not visible from code** — flagged as an assumption inside C-01 |

---

## 3. Findings

Severity scale: **Critical** = exploitable/major business risk now · **High** = material user-facing or scaling problem · **Medium** = real defect or cost, limited blast radius · **Low** = hygiene/polish.

### 3.1 Critical

**C-01 — Open self-service sign-up + shared-workspace RLS = full CRUD on all business data for anyone who registers**
*Where:* `supabase/schema.sql:102–128, 157–183, 218–244, 278–304` (policies `TO authenticated USING (true)` for SELECT/UPDATE/DELETE on `clients`, `properties`, `inspections`, `invoices`); migration `2026_05_12_open_shared_workspace.sql` (confirmed applied to production per its commit message); public Sign-Up tab in `src/pages/Login.jsx`; `signUp()` in `src/lib/AuthContext.jsx:219–254`; the gating component `src/components/UserNotRegisteredError.jsx` exists but is **never imported**.
*Problem:* The shared-workspace model (all team members see all data) is intentional, but nothing restricts **who can become a team member**. There is no allowlist, no admin approval, no email-domain check — in code, anyone on the internet can create an account and immediately read, modify, or permanently delete every client's PII (names, phones, emails, home addresses), all inspections, and all invoices. `UPDATE … WITH CHECK (true)` even permits reassigning rows' `user_id`.
*Assumption to verify:* whether "Allow new users to sign up" or email confirmation is disabled in the Supabase Auth dashboard (not visible from code). Even if email confirmation is on, it only requires a working mailbox — not authorisation.
*Recommended direction (needs your approval):* short-term, disable public sign-ups in Supabase Auth (Dashboard → Authentication → Sign In/Up) and create team accounts manually — zero code change; longer-term, an `allowed_users` table or profile-role check baked into the RLS policies.

### 3.2 High

**H-01 — Inspection photos are world-readable, anonymously, forever**
*Where:* `supabase/schema.sql:403–405` (`inspection-photos` bucket `public = true`) and `:441–445` (explicit `TO anon` SELECT policy). Flagged in the previous audit (H10) — **still open**.
*Problem:* Photo URLs are stable public links; anyone holding (or capturing) a URL can view interiors of clients' homes with no login, indefinitely. URLs circulate inside shared HTML reports.
*Direction:* private bucket + signed URLs (with an expiry) generated at report render time; keep public only if the business explicitly accepts the exposure.

**H-02 — recharts (369 KB raw / 101.9 KB gzip) ships on every first load — 37 % of initial JS — for one pie chart**
*Where:* `vite.config.js:26` (`'charts': ['recharts']` manual chunk); sole live consumer `src/components/dashboard/InspectionChart.jsx:4–11` (a 4-slice status donut on the Dashboard). Verified in **both** the deployed production HTML and a fresh local build: `index.html` emits `<link rel="modulepreload" href="/assets/charts-*.js">`, so the chunk is fetched on first paint of **every** route — including Login, before authentication.
*Measured initial payload (gzip, from the production build log):* entry 24.4 + react-vendor 56.0 + radix 34.3 + supabase 46.0 + query 8.3 + **charts 101.9** + pdf 0.7 ≈ **271.5 KB JS** (+13.6 KB CSS) ≈ 1.05 MB raw to parse — heavy for mid-range field phones on cellular.
*Direction:* replace the one donut with a ~30-line SVG component (or a micro-lib) and delete recharts; that alone removes ~38 % of first-load JavaScript. At minimum, remove the `charts` manual chunk so it lazy-loads with the Dashboard.

**H-03 — Unbounded `select('*')` on every list screen; silent 1,000-row ceiling; client-side-only search/pagination**
*Where:* `src/api/entities.js:252–277` (`list()` applies `.limit()` only if passed — no caller passes one); callers `Dashboard.jsx:27–31`, `Inspections.jsx:36–40`, `Clients.jsx:31–34`, `Properties.jsx:30–33`, `Invoices.jsx:33–38`, `InvoiceForm.jsx:42–46`, `InspectionForm.jsx:154–157`.
*Problem:* Every visit to the Dashboard downloads three entire tables — including each inspection's full `areas`/`photos` JSONB, which list screens never display. PostgREST silently caps responses at 1,000 rows: past that, inspections **vanish from the app** and dashboard KPIs undercount with no error. Search and pagination run in browser memory.
*Direction:* pass `sort`/`limit` (the data layer already supports both), select only list-view columns, and compute dashboard counts with aggregate queries.

**H-04 — The mobile Print-button fix is stranded in draft PR #15 (open since 15 June); production phones still have a dead Print button**
*Where:* PR #15 `claude/report-a4-mobile-print` (3 commits: standalone-tab print for mobile, A4 fit on phones, page-1 spacing) — verified open/draft via GitHub; production domain verified to serve `main` (`807463e`), which predates it.
*Problem:* Field inspectors on phones — the primary persona — cannot print/preview reports properly in the current production build; the completed fix has been parked for a month.
*Direction:* review, un-draft, and merge PR #15 (or decide to close it consciously). No new code needed.

### 3.3 Medium

**M-01 — Cross-user photo deletion always orphans files, and failures are silently swallowed**
*Where:* storage DELETE policy is owner-scoped (`schema.sql:433–439`: `(storage.foldername(name))[1] = auth.uid()::text`) while the inspections-table DELETE policy is open to all authenticated users (`schema.sql:239–244`); `DeleteFile` in `src/api/integrations.js:85–88` logs storage errors but never throws, so the "N photos could not be removed" accounting in `Inspections.jsx` can never trigger.
*Impact:* whenever User B deletes an inspection User A created (normal in a shared workspace), every photo file is left behind in the bucket permanently, while the UI reports success. Storage usage **only grows**; on the Free plan this eats the 1 GB ceiling.

**M-02 — Upload/persist ordering creates orphans and dangling references**
*Where:* `PhotoUpload.jsx:128–134` uploads to storage immediately, but the URL reaches the database only via the form's later autosave; `handleRemove` (`:177–185`) deletes the storage file *before* the removal is saved.
*Impact:* abandoning a form after adding photos orphans the files; removing a photo then failing/discarding the save leaves the DB pointing at a deleted file → broken image in the official client report. `UploadFile` returns `file_path` but the caller discards it, so future cleanup relies on fragile URL parsing.

**M-03 — iPhone HEIC photos fail late with a generic error; transparent PNGs re-encode with black backgrounds**
*Where:* `PhotoUpload.jsx:92–95` (undecodable HEIC falls through to uploading the *original* file) vs the bucket mime allow-list (`schema.sql:404` — jpeg/png/gif/webp only, HEIC rejected server-side); JPEG re-encode has no background fill for PNG alpha. Both flagged previously — **still open**.

**M-04 — Branded as a PWA, but there is no service worker at all**
*Where:* `public/manifest.json` + `index.html` declare an installable standalone app; repo-wide search confirms no service-worker registration, `vite-plugin-pwa`, or workbox.
*Impact:* no offline capability and no asset caching — a real gap for field inspectors on unreliable connections (the localStorage draft in InspectionForm is the only cushion). Either add a service worker (e.g. `vite-plugin-pwa`) or consciously drop the PWA claim.

**M-05 — Dashboard "Recent Inspections" is not sorted by recency**
*Where:* `Dashboard.jsx:77` slices the first 5 rows of an **unordered** `Inspection.list()` result (no `sort` argument → no `ORDER BY` → Postgres returns undefined order). The Inspections page sorts correctly; the Dashboard panel can show arbitrary rows.

**M-06 — Whole-blob JSONB rewrites every 2.5 s while editing**
*Where:* `InspectionForm.jsx:290–348` autosave writes the full `areas` JSONB (all areas → items → photo arrays) each debounce tick; list screens then re-download those blobs (see H-03). Works today; write amplification and payload growth scale with inspection size — worth a size guard and column-selecting list queries.

**M-07 — No pagination or virtualization on Clients / Properties / Invoices**
*Where:* `Clients.jsx:175–226`, `Properties.jsx:181–213`, `Invoices.jsx:166–201` render every filtered row as a `framer-motion` `layout`-animated node. Hundreds of rows → animated-layout work on every render → mobile jank. (Only Inspections paginates, client-side, 5/page.)

**M-08 — React Query is mounted but unused; every navigation re-downloads full tables**
*Where:* `QueryClientProvider` wraps the app (`App.jsx:148`), yet `useQuery` appears only in `PageNotFound.jsx`; all entity data uses bare `useEffect` + `list()`. No caching, deduplication, or background refresh — combined with H-03, each page visit re-pulls everything.

**M-09 — The quality gates are hollow where it matters**
*Where:* `eslint.config.js` lints only `src/components/**`, `src/pages/**`, `Layout.jsx` — `src/lib/**` (auth core), `src/api/**` (data layer), `src/hooks/**`, `App.jsx`, `main.jsx` are unlinted; `no-unused-vars` off; `react-hooks/exhaustive-deps` not enabled. `jsconfig.json` sets `checkJs: false`, so `npm run typecheck` type-checks nothing. Green gates currently prove less than they appear to.

**M-10 — The company logo is hot-linked from a third-party Base44 Supabase project in 6 places**
*Where:* `Layout.jsx:111`, `Login.jsx:14`, `ResetPassword.jsx:13`, `htmlReportGenerator.jsx:16`, plus two dead exporters — all referencing `https://qtrypzzcjebvfcihiynt.supabase.co/...` (infrastructure the team does not control; also embedded in official client reports). Could not test reachability from this sandbox (egress blocked) — but the dependency risk holds regardless. Move the asset into `public/` with one shared constant. Previously flagged — **still open**.

### 3.4 Low

- **L-01 — Dead code & unused dependencies (~1,470 lines + 11 packages).** Verified unimported by any live path: `pdfExport.jsx`, `pdfExporter.jsx` (1,041 lines), `EnhancedPDFExportButton.jsx`, the whole `components/examples/` folder, ~13 shadcn scaffolding components (incl. a duplicate `pagination-1.jsx`). Unused packages: `jspdf`, `html2canvas`, `three`, `react-leaflet`, `react-quill`, `canvas-confetti`, `@hello-pangea/dnd`, `react-markdown`, and (evidenced by the 0.04 KB `forms` chunk stub) `react-hook-form`, `@hookform/resolvers`, `zod`. All are tree-shaken from the bundle (no runtime cost) but slow installs, muddy maintenance, and enlarge the supply-chain surface.
- **L-02 — `entities.create`/`bulkCreate` make a network `auth.getUser()` round-trip per insert** (`entities.js:238–247`) purely to stamp `user_id`; the locally-cached session would do.
- **L-03 — `keep-alive` endpoint observations (safe as-is):** uses only the public anon key (no service-role key anywhere in the repo — verified), always returns HTTP 200 with status in the body, RLS limits the ping to zero rows. No change required.
- **L-04 — Residual unescaped `photo.url` interpolation in the dead `pdfExporter.jsx:974`** — unreachable from live pages; delete with L-01 or escape for consistency.
- **L-05 — RTL regressions in `ClientForm.jsx`** (`left-3`/`pl-10`/`top-3` instead of the logical properties used elsewhere).
- **L-06 — Cosmetics:** demo-mode-only `console.log`s; ~68 lines of commented-out Vite starter CSS in `index.css`; two parallel toast stacks mounted (radix `Toaster` + Sonner) with only Sonner used; `InspectionReport` reads `window.location.search` instead of router hooks; Google Fonts (Geist/Inter) loaded from a third party despite the "system fonts" design principle (mitigated by `preconnect` + `display=swap`).
- **L-07 — Schema hygiene:** legacy `properties.area_sqft` column no longer written; no CHECK constraints on `status`/`inspection_type`; autosave creates a real `scheduled` inspection on first keystroke, so abandoned drafts persist as rows.

### 3.5 Verified strengths (for balance)

Route-level code splitting with lazy pages and sensible vendor chunking; a genuinely robust InspectionForm (debounced autosave, `updated_at` optimistic-concurrency with a conflict dialog, localStorage draft recovery, `beforeunload` guard); race-safe effects and per-entity error toasts; auth listener correctly unsubscribed and the supabase-js v2.65+ locks deadlock consciously avoided; app-wide ErrorBoundary; escaped report HTML rendered in a script-less sandboxed iframe; dev-only gating of the Base44 tooling; clean secrets hygiene (no service-role key, no committed `.env`, nothing sensitive in git); 44 px touch targets, safe-area awareness, dark-mode flash prevention. Eleven of the previous audits' P0/P1/P2 items were spot-checked and confirmed fixed.

---

## 4. Backend Database & Supabase Storage Analysis

### 4.1 Production health (verified live, 17 July 2026)

| Check | Result |
|---|---|
| Site `waslapro.vercel.app` | HTTP 200, HSTS + CSP frame-ancestors + nosniff + referrer-policy present |
| Production deployment | `dpl_Gx35cgo…`, commit `807463e` = current `main` (12 Jun 2026) — **production is up to date** |
| Vercel serverless runtime errors (7 days) | **None** |
| Keep-alive cron (`vercel.json`, daily 00:00 UTC) | Live invocation returned `{"status":"success","message":"Database pinged successfully"}` → **production database up** |
| Un-deployed work | Draft PR #15 (mobile print/A4) — see H-04 |

### 4.2 Image storage integrity — are uploads stored correctly?

**Verified at the code level, with operational evidence — yes.**
Pipeline as built (all parameters verified in `PhotoUpload.jsx` / `integrations.js` / `schema.sql`):

- Client-side compression before upload: skipped under 500 KB; longest side downscaled to 2048 px; JPEG quality stepped 0.8 → 0.65 → 0.5 until ≤ ~1.2 MB; hard reject only if still > 10 MB after compression (matches the bucket's 10 MB limit); source decode cap 40 MB; upload concurrency 3 with per-file error accounting.
- Path scheme `inspection-photos/{userId}/{timestamp}-{random}.{ext}` — collision-safe and satisfies the owner-scoped INSERT policy. Extension derived from mime type (camera/clipboard files often lack one).
- The returned public URL (never base64) is stored in the inspection's JSONB; avatars use a deterministic `{userId}/avatar.{ext}` with upsert.
- Server-side enforcement: bucket mime allow-list (jpeg/png/gif/webp) + 10 MB cap.
- Operational evidence it works in production: PR #11's compression fix shipped in response to real field reports of oversized-photo rejections, and the current flow was QA'd in `QA_AUDIT.md`.

**Integrity gaps (per findings):** guaranteed orphans on cross-user deletes (M-01), orphan/dangling-reference windows around unsaved forms (M-02), HEIC edge case (M-03), and world-readable photos (H-01). There is **no reconciliation or cleanup job**, so bucket usage is monotonically increasing.

### 4.3 Capacity assessment vs plan limits

Plan quotas (verified from Supabase docs, 17 Jul 2026): **Free** — 500 MB database, 1 GB storage, 5 GB uncached + 5 GB cached egress/month, 50 K MAU; exceeding quotas triggers Fair-Use grace then service restriction (project can go read-only / 402). **Pro ($25/mo)** — 8 GB disk, 100 GB storage, 250 GB + 250 GB egress. The presence of the keep-alive cron (needed only to stop Free-plan pausing) strongly implies the project is on the **Free plan** (assumption — confirm on the billing page).

Evidence-based model (compression parameters verified above; photo counts are assumptions to refine with real numbers):

| Resource | Model | Headroom |
|---|---|---|
| **Storage 1 GB** | Compressed photos land ~0.3–1.2 MB → ceiling ≈ 850–3,000 photos. At 20–30 photos/inspection → **≈ 30–100 photo-heavy inspections total**. Orphans (M-01/M-02) consume this without showing in the app. | **Binding constraint — plan around this.** |
| **Database 500 MB** | Inspections store text + URLs in JSONB (photos live in Storage, never in Postgres — verified). Even at ~100 KB/inspection → thousands of inspections. | Not the constraint. |
| **Egress 5 GB + 5 GB cached / month** | A rendered report embeds every photo full-size: a 25-photo report ≈ 10–30 MB per first view (repeat views largely hit the CDN → cached quota). | Roughly a few hundred full report views/month on Free; watch it as report sharing grows. |

### 4.4 What could not be measured this session — and exactly how to measure it

The production Supabase project (under `waslapro@outlook.com`) is not linked to this session's Supabase connector, and direct network calls to `supabase.co` are blocked from this sandbox (details in §2). Two-minute self-serve options:

**Option A — Dashboard:** supabase.com → the waslapro project → **Settings → Usage** (or organisation **Billing → Usage**): shows Database size, Storage size, and Egress against quota.

**Option B — SQL Editor** (read-only):

```sql
-- Storage usage per bucket
SELECT b.id AS bucket,
       COUNT(o.id) AS objects,
       pg_size_pretty(COALESCE(SUM((o.metadata->>'size')::bigint),0)) AS total
FROM storage.buckets b
LEFT JOIN storage.objects o ON o.bucket_id = b.id
GROUP BY b.id ORDER BY 3 DESC;

-- Database size
SELECT pg_size_pretty(pg_database_size(current_database()));

-- Largest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;

-- Orphan candidates: files in storage not referenced by any inspection JSONB
-- (run occasionally; verify a sample before deleting anything)
SELECT o.name, pg_size_pretty((o.metadata->>'size')::bigint) AS size, o.created_at
FROM storage.objects o
WHERE o.bucket_id = 'inspection-photos'
  AND NOT EXISTS (
    SELECT 1 FROM inspections i
    WHERE i.areas::text LIKE '%' || o.name || '%'
       OR i.photos::text LIKE '%' || o.name || '%')
ORDER BY o.created_at;
```

For continuous visibility, linking the `waslapro@outlook.com` Supabase account to the Claude Supabase connector would let a future session run these live, plus the built-in security/performance advisors.

---

## 5. Recommendations

**No changes have been made.** Everything below awaits your explicit approval.

### 5.1 Urgent (close these first)

| # | Action | Addresses | Effort |
|---|---|---|---|
| 1 | Disable public sign-ups in the Supabase Auth dashboard (or add an allowlist gate); audit `auth.users` for unknown accounts | C-01 | Minutes (dashboard) |
| 2 | Decide the photo-privacy stance; if private: flip bucket to private + signed URLs in the report path | H-01 | Small PR |
| 3 | Review & merge draft PR #15 (mobile print + A4 fit) | H-04 | Review only |
| 4 | Check real usage numbers (§4.4) and set a plan decision point (Free vs Pro) before the 1 GB ceiling is hit; enable usage-warning emails | §4.3 | Minutes |
| 5 | Fix delete-flow orphans: align storage DELETE policy with the shared-workspace model (or route deletes through the row owner), and make `DeleteFile` report failures | M-01 | Small PR |

### 5.2 High-value performance improvements

| # | Action | Addresses | Expected effect |
|---|---|---|---|
| 6 | Replace the one recharts donut with a small SVG component; drop `recharts` and the `charts` manual chunk | H-02 | −102 KB gzip (−38 %) initial JS on every route |
| 7 | Add `sort`/`limit` + column selection to list queries; aggregate queries for Dashboard KPIs (also fixes the unsorted "Recent Inspections", M-05) | H-03, M-05, M-06 | Bounded payloads; correct KPIs past 1,000 rows |
| 8 | Adopt React Query for entity reads (it's already installed & mounted) | M-08 | Instant back-navigation, deduped refetches |
| 9 | Add pagination (component already exists) to Clients/Properties/Invoices; drop `layout` animations on long lists | M-07 | Smooth lists at scale |

### 5.3 Optional enhancements / hygiene

- Service worker via `vite-plugin-pwa` for offline app-shell (M-04) — high leverage for field use, moderate effort; or drop the PWA claim.
- Persist-then-delete ordering for photo removal + store `file_path` alongside `url`; periodic orphan sweep using the §4.4 query (M-02).
- HEIC: detect and convert client-side (e.g. `heic2any`) or extend the bucket allow-list; white-fill JPEG re-encodes of transparent PNGs (M-03).
- Self-host the logo in `public/` behind one constant (M-10) and the Google Fonts files (L-06).
- Delete dead exporters/examples/scaffolding and the 11 unused packages (L-01); remove the `pdf`/`forms` manual chunks with them.
- Widen ESLint to all of `src`, enable `exhaustive-deps`, re-enable `no-unused-vars`; set `checkJs: true` and triage (M-09).
- `getSession()` instead of `getUser()` for user-id stamping (L-02); RTL fixes in ClientForm (L-05); drop the unused toast stack; CHECK constraints on status columns and a cleanup policy for abandoned `scheduled` drafts (L-07).

---

## 6. Accuracy & Quality Checks

- **Reproducibility:** every code finding carries file:line references against commit `807463e` (= production). Build metrics come from the production deployment's build log and were reproduced with a local build in this session.
- **Verified vs assumed:** live-infrastructure facts (deployment state, runtime errors, DB reachability, plan quotas) were captured this session and are dated. The three explicit assumptions are labelled in place: (1) Supabase Auth dashboard sign-up settings (C-01), (2) the project being on the Free plan (§4.3), (3) photos-per-inspection volume in the capacity model (§4.3). Nothing else in this report is inferred.
- **Storage metrics:** current byte-level usage was **not** measurable with this session's access; §4.4 documents why and provides the exact queries — treat the capacity table in §4.3 as a model, not a measurement, until those numbers are pulled.
- **Feasibility:** every recommendation maps to a finding, names the file(s) involved, and was checked against the existing architecture (e.g., the data layer already supports `sort`/`limit`; React Query and a Pagination component are already installed).
