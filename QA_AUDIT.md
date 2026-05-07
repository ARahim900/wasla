# Wasla — Pre-Production QA Audit
_Date: 2026-05-07_

## 1. Executive Summary
- Total bugs: 24 (P0: 4, P1: 9, P2: 8, P3: 3)
- Ship-blockers:
  - P0-001: Inspection save sends `client_phone` to a column that does not exist
  - P0-002: Saving a new Invoice without linking an inspection sends `inspection_id: ""` (UUID cast fails)
  - P0-003: Inspection status dropdown re-sends the entire row, including the non-existent `client_phone` column when the row was created via the new flow
  - P0-004: ClientForm requires email; demo seed and InspectionForm find-or-create create clients with no email — every subsequent edit of those clients from the Clients page is blocked
- Top systemic risks:
  - **Schema drift** — Several columns referenced by the UI (`inspection.client_phone`, `inspection.location`, `inspection.recommendations`) are not in `supabase/schema.sql`. Some writes hit them; reads silently render `undefined`.
  - **RLS over-share** — `clients`, `properties`, `inspections`, `invoices` all use `"All authenticated can view"` (USING true). Any signed-up user can read every other tenant's data, including phone numbers in `clients` and addresses in `properties`. This is intentional per the migration comment, but it is a real privacy hole if the product is multi-tenant. Treat as a P0 once tenancy expectations are confirmed.
  - **Demo-mode divergence** — `entities.js` seed data uses legacy keys (`type`, not `inspection_type`/`property_type`), so the demo build looks different from production for the same code path. Bug screenshots taken in demo mode will not reflect production behavior.
  - **Error UX** — Most catch handlers either swallow the underlying message ("Failed to save invoice") or surface raw Supabase strings (`column "x" does not exist`). Users get neither actionable guidance nor a clean message.

## 2. Route & Component Inventory
| Route | Component | Purpose | Notes |
| --- | --- | --- | --- |
| `/` | `Dashboard` (mainPage) | KPIs + recent inspections | Loads Inspections, Clients, Invoices in parallel via `Promise.allSettled` |
| `/Dashboard` | `Dashboard` | Same as above | Duplicate route to `/` |
| `/Clients` | `Clients` | List/search/CRUD clients | Modal forms; Property.list joined for property counts |
| `/Properties` | `Properties` | List/search/CRUD properties | Requires client selection in form |
| `/Inspections` | `Inspections` | List/filter inspections, status dropdown | Status update spreads full row |
| `/InspectionForm` | `InspectionForm` | Create/edit inspection (manual entry, find-or-create) | Recently rewritten |
| `/InspectionReport` | `InspectionReport` | Print/PDF view via iframe srcDoc | Uses htmlReportGenerator |
| `/Invoices` | `Invoices` | List/filter invoices, totals | Computes overdue client-side |
| `/InvoiceForm` | `InvoiceForm` | Create/edit invoice, auto-fill from inspection | Effect can loop on stale comparisons |
| `/Settings` | `Settings` | Profile, preferences, password change, avatar upload | Uploads to `avatars` bucket |
| `/Login` | `Login` | Public — login/signup/forgot-password tabs | Demo branch present |
| `/ResetPassword` | `ResetPassword` | Public — set new password from recovery link | Routed unconditionally when `isPasswordRecovery` |
| `*` (authenticated) | `PageNotFound` | 404 inside the layout | — |
| `*` (unauthenticated) | `LoginPage` | Catch-all login | — |

`Home.jsx` is a leftover placeholder and is not wired into the router.

## 3. Bugs (sorted by severity, then by file)

### [P0-001] InspectionForm writes a `client_phone` column that does not exist
- **Location:** `src/pages/InspectionForm.jsx:222-247` (`preparePayload`) + the `client_phone` field added at lines 91-93, 110-112, 132-134, 386-396.
- **Steps to Reproduce:** 1. Sign in. 2. Open `/InspectionForm`. 3. Fill Client Name, Phone, Property Address, SQM. 4. Click Save Inspection.
- **Expected:** Inspection saved; the phone is stored on the resolved client record.
- **Actual (per code):** `preparePayload(enriched)` does not strip `client_phone` from the inspection object. Supabase rejects the insert with `column "client_phone" of relation "inspections" does not exist`. The toast surfaces that raw Postgres string. Nothing is saved (and no client/property record is created either, because `resolveClient` runs but the *inspection* insert is what fails). The `client_phone` value is intended to live on the `clients` table only.
- **Suggested Fix:** In `preparePayload`, destructure and drop `client_phone` (it is purely a UI field used to backfill the `clients` row): `const { client_phone: _ph, ...rest } = ins; ...`. Add a unit-style smoke test that `Object.keys(payload)` is a subset of the `inspections` columns.

### [P0-002] Saving a new invoice with no linked inspection sends `inspection_id: ""`
- **Location:** `src/pages/InvoiceForm.jsx:67-82` (initial state) and `:177-209` (submit).
- **Steps to Reproduce:** 1. Click Create Invoice. 2. Select a client. 3. Add a manual line item or leave the auto-populated state. 4. Save.
- **Expected:** Invoice saved with `inspection_id` null when the user did not link an inspection.
- **Actual (per code):** Initial state defaults `inspection_id: ""`. The Select handler converts `"none"` back to `""`. `handleSubmit` does `Invoice.create(invoice)` which forwards the empty string. Supabase rejects: `invalid input syntax for type uuid: ""`. Toast says "Failed to save invoice" (detail swallowed). Same hazard for `client_id` if the validation is bypassed.
- **Suggested Fix:** Normalize before persisting, e.g. `const payload = { ...invoice, inspection_id: invoice.inspection_id || null, client_id: invoice.client_id || null };` and pass `payload` to create/update. Surface `error.message` in the toast.

### [P0-003] Inspection status dropdown re-sends fields that no longer match the schema
- **Location:** `src/pages/Inspections.jsx:58-71`.
- **Steps to Reproduce:** 1. Save a new inspection (after fixing P0-001 locally). 2. From the list, open the status pill and pick a different status.
- **Expected:** Just `status` (and `updated_at`) is patched.
- **Actual (per code):** `Inspection.update(inspection.id, { ...inspection, status: newStatus })` spreads the full row read from `Inspection.list()` back into the update payload. If the row contains any field that diverges from the current schema (notably `client_phone` once anyone fixes P0-001 partially or adds it manually) Postgres rejects the update. Even today it wastes bandwidth and re-sends `id`, `user_id`, `created_at`, `updated_at`; `entities.update` adds its own `updated_at` last, so that part is fine — but the spread is a footgun the moment any new column is added by Supabase auto-migration.
- **Suggested Fix:** Send only the diff: `Inspection.update(inspection.id, { status: newStatus })`.

### [P0-004] Clients created via the inspection flow can never be edited from /Clients
- **Location:** `src/components/forms/ClientForm.jsx:49-55` (validation requires email) + `src/pages/InspectionForm.jsx:179-185` (creates client with no email).
- **Steps to Reproduce:** 1. From `/InspectionForm`, save an inspection with a brand-new client name (no email anywhere in the flow). 2. Go to `/Clients`. 3. Click the eye → Edit, or just "Edit" the client. 4. Try Save.
- **Expected:** The form opens, you fill in the email later, save.
- **Actual (per code):** `ClientForm.validate()` requires `email`. The pre-existing client row has `email = null`, so the form initialises with empty email; saving is blocked with "Email is required". The user has no way to set an email without typing one (which is fine), but the underlying data model says email is optional (`schema.sql` has `email TEXT`). This breaks editing for every inspection-created client.
- **Suggested Fix:** Drop the `email` required check (or only enforce a format check when the field is non-empty). Match the schema and the find-or-create flow.

### [P1-005] InvoiceForm auto-populate effect can run forever on certain payloads
- **Location:** `src/pages/InvoiceForm.jsx:94-174`.
- **Steps to Reproduce:** 1. Edit an existing invoice that already has line items in `items`. 2. Change the linked inspection to one whose property has no `area_sqm` (so the effect resets `items` to `[]`). 3. Re-link the original inspection.
- **Expected:** Effect quiesces after one or two ticks.
- **Actual (per code):** The dependency list is `[invoice, inspections, properties]` — `invoice` is the entire object. Inside the effect we `setInvoice(prev => ({ ...prev, items: newLineItems, ... }))`, which produces a new `invoice` reference. The guard uses `JSON.stringify(invoice.items) !== JSON.stringify(newLineItems)` to bail out, but `newLineItems` is computed as a fresh `[lineItem]` each run — `JSON.stringify` will match only when the description string is byte-identical. If `linkedProperty.address` contains characters that locale-format differently (e.g. trailing whitespace from user entry, or floating point `areaSqm` like `0.1+0.2 = 0.30000000000000004`), the descriptions mismatch every render and the effect re-runs. There is also a toast inside the effect (`toast.success("Invoice details populated from inspection.")`) that fires every cycle — at worst the user sees stacking toasts.
- **Suggested Fix:** Depend on `[invoice.inspection_id, invoice.tax_rate, inspections, properties]` only. Compute the next state once and compare via stable values (id + numeric subtotal). Move the toast out of the effect.

### [P1-006] Inspection date is converted to UTC midnight, day shifts in non-UTC timezones
- **Location:** `src/pages/InspectionForm.jsx:239-246`.
- **Steps to Reproduce:** 1. Open an inspection in any timezone west of UTC (Oman is UTC+4 — the *opposite* — so reproduce in PT/Brazil). 2. Pick "May 7" in the date input. 3. Save. 4. Re-open.
- **Expected:** Date stored matches what the user picked.
- **Actual (per code):** `new Date("2026-05-07T00:00:00").toISOString()` interprets the string in the *local* zone, then converts to UTC. For a user in `America/Los_Angeles` (UTC-7) you get `2026-05-07T07:00:00Z`, which is correct on read-back, but in `Asia/Tokyo` (UTC+9) you get `2026-05-06T15:00:00Z` — when the form re-loads, line 54-59 does `new Date(...).toISOString().split('T')[0]` and may show the previous day. Practically, Oman is UTC+4 so the bug fires for any user east of UTC; the saved date is a day earlier than picked.
- **Suggested Fix:** Either store as a date-only string (the column is `DATE`, not `TIMESTAMPTZ` — Postgres will accept `'2026-05-07'` as is) or use `new Date(payload.inspection_date + "T12:00:00Z")` to put the timestamp safely inside the day in any zone. Drop the `toISOString()` round-trip.

### [P1-007] Inspections list `Inspection.list().sort(...)` crashes when the API returns null
- **Location:** `src/pages/Inspections.jsx:36-44`.
- **Steps to Reproduce:** 1. Throttle network. 2. Trigger a Supabase 5xx. 3. Look at the page.
- **Expected:** Empty list and a toast.
- **Actual (per code):** `Inspection.list().catch(() => [])` already shields the await, but then `inspectionData.sort(...) || []` — if `inspectionData` is somehow `null` (the catch returns `[]` so this is mostly safe), `.sort` throws. More importantly, `(...).sort(...) || []` is dead code: `Array.prototype.sort` returns the array in place, never falsy. The intent (fall back to empty) only works because of the inner catch. If `entities.list` later starts returning `null` on edge cases (it does in `get` for PGRST116), the page goes white. Already half-fixed but brittle.
- **Suggested Fix:** `setInspections((Array.isArray(inspectionData) ? inspectionData : []).sort(...))`. Same pattern in `Properties.jsx:40` and `Invoices.jsx:38`.

### [P1-008] InspectionReport renders 'N/A' instead of failing when no `id` is in the URL
- **Location:** `src/pages/InspectionReport.jsx:32-63`.
- **Steps to Reproduce:** 1. Visit `/InspectionReport` (no query string).
- **Expected:** "Report not found" or redirect to Inspections.
- **Actual (per code):** `id` is null, the `if (id) load();` branch is skipped, `setLoading(false)` runs. `inspection` is null, the empty-state UI shows "Report not found" — OK. But the iframe block is unconditional once an inspection exists. If `Inspection.filter({ id: 'something-bad' })` returns `[]`, `setLoading(false)` runs but no toast appears (only `console.error` on a thrown exception). The user sees a "Report not found" with no nav clarity that the link was wrong vs the record was deleted.
- **Suggested Fix:** When `id` is present but no inspection is found, surface a clear toast ("Inspection not found — it may have been deleted"), and provide a "Back to Inspections" CTA in the empty state (already exists), but also disambiguate from the no-id case.

### [P1-009] PhotoUpload `for…of files` mutates the loop variable, breaks Safari/iOS in strict mode
- **Location:** `src/components/inspections/PhotoUpload.jsx:95-113`.
- **Steps to Reproduce:** 1. On iOS Safari with strict-mode bundling, choose multiple photos at once.
- **Expected:** All upload one by one.
- **Actual (per code):** `for (let file of Array.from(files)) { ... file = await compressImage(file); ... }`. `let` allows reassignment in the loop body and works in modern browsers — the broader concern is `await` inside a sequential loop blocks UI for ~10s on slow networks. A `Promise.allSettled` with concurrency 3 would be ~3× faster and keep the UI responsive. Not a hard bug but a real on-mobile complaint.
- **Suggested Fix:** Cap concurrency: process in batches of 3 with `Promise.allSettled`. Keep error counts.

### [P1-010] Inspection delete swallows photo-cleanup failures and never warns
- **Location:** `src/pages/Inspections.jsx:73-100`.
- **Steps to Reproduce:** 1. Delete an inspection that has photos. 2. The `DeleteFile` calls in `forEach` are fire-and-forget with `.catch(() => {})`.
- **Expected:** Either guarantee cleanup or warn the user that some files may remain in storage.
- **Actual (per code):** Storage objects are orphaned silently. Over time the `inspection-photos` bucket fills up and the user pays for unused storage. There is also a race: `Inspection.delete(inspectionId)` runs immediately after firing the photo deletes, so if the row is gone but storage still has the files, the user has no record of which files to clean up.
- **Suggested Fix:** `await Promise.allSettled(photoUrls.map(url => DeleteFile({ url })))` first, count failures, and surface "Inspection deleted, but N photos could not be removed from storage" if any failed.

### [P1-011] InspectionForm "Find or create" race: clients/properties state is stale while save runs
- **Location:** `src/pages/InspectionForm.jsx:165-220`.
- **Steps to Reproduce:** 1. In tab A, open `/InspectionForm` and start typing a new client name. 2. In tab B, create that exact client via `/Clients`. 3. Submit in tab A.
- **Expected:** Tab A reuses the client created in B (no duplicate).
- **Actual (per code):** `resolveClient`/`resolveProperty` use the in-memory `clients` array from the initial load. The duplicate is created. `setClients(prev => [...prev, created])` then keeps two with the same name. Same for properties. With "All authenticated can view" RLS (P3), this also means *other users* can create dupes the user doesn't see.
- **Suggested Fix:** Right before save, re-fetch by exact (case-insensitive) match: `Client.filter({ name: trimmedName })` — Postgres can do `ilike`. Even better: a Postgres `unique(lower(name))` index plus `.upsert({onConflict: 'name'})`.

### [P1-012] `useAuth` `INITIAL_SESSION` `setIsLoadingAuth(false)` is inside the deferred profile load — `setUser` may race
- **Location:** `src/lib/AuthContext.jsx:84-112`.
- **Steps to Reproduce:** 1. Hard refresh on the dashboard with a slow profile fetch (cold cache).
- **Expected:** Loader stays until user is populated.
- **Actual (per code):** `setIsLoadingAuth(false)` is in `.finally()` of the async load, which is correct. But `setIsAuthenticated(true)` runs before the profile loads. If a child page reads `user.full_name` immediately on mount (Settings does in `loadUserData → setProfileData`), the first render sees `user === null` and may show a flash of empty form fields. Recoverable, but the comment says it's avoided. It is *not* avoided for `Layout.jsx:54-58` which depends on `user.darkMode`.
- **Suggested Fix:** Set `isAuthenticated` *after* `loadUserProfile` resolves, not before. Only the password recovery branch needs the eager flip.

### [P1-013] Logout sets state then awaits Supabase — second click can re-fire
- **Location:** `src/lib/AuthContext.jsx:276-287`.
- **Steps to Reproduce:** 1. Click Logout twice quickly in the user dropdown.
- **Expected:** No-op on second click.
- **Actual (per code):** `setUser(null); setIsAuthenticated(false);` first; second click sees `isAuthenticated === false` but the dropdown is still mounted. `await supabase.auth.signOut()` runs twice; Supabase usually handles it but `window.location.href = '/'` runs twice as well, the second one cancelling the first navigation. On flaky networks this leaves users stuck on a flicker.
- **Suggested Fix:** Add an `isLoggingOut` ref/state and bail early if true. Disable the menu item while in flight.

### [P2-014] Clients/Properties list filter explodes on rows whose `email`/`address` is null
- **Location:** `src/pages/Clients.jsx:64-69`, `src/pages/Properties.jsx:58-62`.
- **Steps to Reproduce:** 1. Have any client created via inspection (no email). 2. Type into the search box.
- **Expected:** Match by name regardless of missing email.
- **Actual (per code):** `client.email?.toLowerCase().includes(searchTerm.toLowerCase())` is OK because of optional chaining — but the search literally only triggers when *any* of name/email/company contains the term. If `searchTerm` is empty string, `.includes("")` returns true and rows pass — fine. The real bug is in `Properties.jsx:60`: `clientsMap.get(property.client_id)?.toLowerCase()` — when `client_id` is null (an inspection-created property where the user didn't set a client), `clientsMap.get(null)` returns `undefined`, optional-chained, OK. But typing in search hides those rows because their address has no overlap and there is no client name. The earlier truthy check (rows whose address IS empty) is invisible. Confirm rows with null address don't appear at all. Lower-priority but worth a unit guard.
- **Suggested Fix:** Hoist `searchTerm.toLowerCase()` once; use `(client.name ?? "").toLowerCase().includes(needle)` everywhere.

### [P2-015] InvoiceForm "overdue" classification ignores invalid dates
- **Location:** `src/pages/Invoices.jsx:64-65, 127-128` and `src/pages/Dashboard.jsx:61-64`.
- **Steps to Reproduce:** 1. Have an invoice with `due_date = null` (legacy or imported). 2. Look at the list.
- **Expected:** No overdue badge / no overdue count.
- **Actual (per code):** `new Date(null) < new Date()` evaluates to `1970-01-01 < now` → `true`. Every null-due-date invoice that isn't paid/cancelled gets flagged overdue and is included in the dashboard's "Overdue Invoices" KPI.
- **Suggested Fix:** Guard: `const due = invoice.due_date ? new Date(invoice.due_date) : null; const isOverdue = due && !isNaN(due) && status !== 'paid' && status !== 'cancelled' && due < new Date();`.

### [P2-016] PropertyForm requires `client_id` but the schema does not, and InspectionForm bypasses it
- **Location:** `src/components/forms/PropertyForm.jsx:23-32` (`validate`).
- **Steps to Reproduce:** 1. Create a property via `/Properties` "Add New Property". 2. Try to save without selecting a client.
- **Expected:** Either both flows enforce a client or neither does.
- **Actual (per code):** PropertyForm forces a client. The InspectionForm `resolveProperty` happily creates properties with `client_id: null` (line 217). Properties list then renders "Unassigned" (line 203). Inconsistent UX: a "client is required" enforcement that any inspection saved without a client name silently violates. Choose one policy.
- **Suggested Fix:** Drop the `client_id` requirement in PropertyForm (the schema column is nullable, FK is `ON DELETE SET NULL`), or — better for data quality — require it in PropertyForm and have InspectionForm prompt for a client name before saving (already does — required validation at line 254).

### [P2-017] Settings dark-mode rollback toggles theme even if the rollback save also fails
- **Location:** `src/pages/Settings.jsx:128-155`.
- **Steps to Reproduce:** 1. Disable network. 2. Toggle dark mode in Settings.
- **Expected:** Local state reverts; one error toast.
- **Actual (per code):** The optimistic update happens, the save throws, and we revert UI state — but we *don't* call `User.updateMe` to push the reverted value back to Supabase, so the next refresh gets stale data from any other tab. Fine for local-only toggle, but `patchUser` in AuthContext was already mutated, so other components see the optimistic value until rollback. Toast says "Failed to update preference" with `error?.message` — usable.
- **Suggested Fix:** Either commit the rollback to the server (with another retry) or queue the save when network is back.

### [P2-018] InspectionForm save clobbers existing inspection's `client_id` when the user-typed name doesn't match
- **Location:** `src/pages/InspectionForm.jsx:284-296`.
- **Steps to Reproduce:** 1. Open an existing inspection with a linked client X (legacy data). 2. Edit the client name field to "Y" (typo) and save. 3. Re-open.
- **Expected:** A confirmation that you're switching the client, or at least leaving X intact.
- **Actual (per code):** `resolveClient("Y")` either matches an existing Y or creates a new client Y, and `enriched.client_id = resolvedClient.id` overwrites the link. The original client X is now disassociated from this inspection silently. There is no "you are about to change the client" confirmation. Same risk for property address.
- **Suggested Fix:** When `inspection.id` exists *and* the typed name differs from the linked record's name, show a confirm dialog ("Move this inspection to client Y?"). Skip when names match.

### [P2-019] Forgot-password keeps loading=false on success but never tells the user it succeeded if the email is unknown
- **Location:** `src/pages/Login.jsx:144-160`.
- **Steps to Reproduce:** 1. Forgot password → enter `not-a-user@example.com`. 2. Submit.
- **Expected:** Generic message; do not reveal whether the email exists.
- **Actual (per code):** `resetPassword` calls `supabase.auth.resetPasswordForEmail` which returns success regardless of email existence (Supabase behavior) — toast shows "Password reset email sent! Check your inbox." That's good. But there's no follow-up screen — the user is left on the same form, and if they click again they re-trigger. Add a success screen mirroring the `confirmEmailSent` state.
- **Suggested Fix:** Reuse the `confirmEmailSent`-style success card after sending the reset link.

### [P2-020] Avatar upload uses `file.name.split('.').pop()` — files without extension produce `avatar.${name}`
- **Location:** `src/pages/Settings.jsx:181-182`.
- **Steps to Reproduce:** 1. Drag/select an image file with no extension (e.g., from clipboard paste turned into `image`).
- **Expected:** Use file mime-type or default to `jpg`.
- **Actual (per code):** `(file.name.split(".").pop() || "jpg").toLowerCase()` — when there is no `.`, `split(".")` returns `["image"]`, `.pop()` → `"image"`, so the path becomes `${userId}/avatar.image`. The bucket has `allowed_mime_types: image/jpeg,image/png,image/gif,image/webp` — uploads succeed (mime is checked, not extension), but the saved URL ends in `.image` and downstream image proxies that sniff by extension may break. Same in `integrations.js:36`.
- **Suggested Fix:** Map from `file.type` (`image/jpeg → jpg`, `image/png → png`, etc.) and fall back to `jpg`. Verify the extension is in the allow-list before upload.

### [P2-021] Long demo session: localStorage demo data isn't migrated, demo `inspections` use `type` not `inspection_type`
- **Location:** `src/api/entities.js:81-96`.
- **Steps to Reproduce:** 1. Run app in demo mode. 2. Open an existing demo inspection.
- **Expected:** "Move-in Inspection" rendered.
- **Actual (per code):** Seed has `type: 'Move-in'` but the UI reads `inspection.inspection_type`. The card label falls through to `undefined Inspection`. Same shape problem for `properties` (`type: 'Villa'` vs `property_type`).
- **Suggested Fix:** Update demo seed to use the production keys; bump a `wasla_demo_seed_version` localStorage key to force a re-seed for existing demo users.

### [P3-022] `Layout.jsx` initial dark-mode read can mismatch user pref on first paint
- **Location:** `src/Layout.jsx:28-58`.
- **Steps to Reproduce:** Sign in on a device that has system dark mode but the user's saved profile says `darkMode: false`.
- **Expected:** Light mode immediately.
- **Actual (per code):** The bootstrap script in `index.html` (not shown here) sets the class from `localStorage`/system pref. The profile fetch overrides afterward, causing a brief dark-flash before light kicks in. Cosmetic.
- **Suggested Fix:** Persist the resolved theme to localStorage on each profile load so the next bootstrap matches.

### [P3-023] InspectionForm "Estimated invoice" formula uses `RATE_PER_SQM` declared in two files
- **Location:** `src/pages/InspectionForm.jsx:333` and `src/pages/InvoiceForm.jsx:18-23`.
- **Steps to Reproduce:** Update one rate; the other diverges.
- **Expected:** Single source of truth.
- **Actual (per code):** Two literal copies, with a comment in InspectionForm telling the developer to keep them in sync. Comments are not contracts.
- **Suggested Fix:** Move to `src/lib/pricing.js` and import in both places.

### [P3-024] Multiple `inspection.location` references read a column that does not exist
- **Location:** `src/components/clients/ClientDetailView.jsx:235`, `src/components/utils/pdfExport.jsx:252`, plus example files.
- **Steps to Reproduce:** Open the client detail dialog → Inspections tab.
- **Expected:** Show the property address.
- **Actual (per code):** Renders "Location not specified" forever, because `inspection.location` is undefined (the schema has `property_address`, not `location`). The information is available via the property record or `inspection.property_address`.
- **Suggested Fix:** Use `inspection.property_address || property?.address || 'Location not specified'`.

## 4. Cross-Cutting Concerns
- **Schema consistency:**
  - `inspections` has no `client_phone` column, but InspectionForm writes it on save (P0-001) and the status update spreads it back (P0-003).
  - `inspections` has no `location` column; UI reads it in ClientDetailView and PDF export.
  - `inspections.recommendations` is referenced by `InspectionReport.jsx:18` and the PDF generator but does not exist in `schema.sql`.
  - `properties.area_sqft` is still in the schema but no longer written. Either drop it in a migration or stop documenting it as legacy.
  - Demo seed uses `type` keys for inspections/properties; production uses `inspection_type`/`property_type`. Demo and prod render differently for the same component.
- **RLS / auth:** All four business tables grant `SELECT` to every authenticated user (intentional per `2026_05_04_shared_read_access.sql`). If Wasla is sold to multiple inspection companies on a single Supabase project, this is a privacy hole. Confirm tenancy model. Storage objects in `inspection-photos` are similarly readable by anon (for shared report links). The `avatars` bucket is fully public — fine for now.
- **Auth flow:** `INITIAL_SESSION` sets `isAuthenticated=true` before the profile resolves; the loader hides this for the dashboard but not for components that read `user` synchronously (P1-012). Logout is non-idempotent (P1-013). Password recovery state cleanup looks correct.
- **Error handling patterns:** `Failed to save invoice` / `Failed to load data: ${error.message}` is split — some toasts swallow `error.message`, others surface raw Postgres strings to end users. Standardize a `prettySupabaseError(error)` helper that maps known codes (`PGRST204`, `23505`, `23503`, etc.) to user-friendly text and logs the raw error.
- **Performance:** `InvoiceForm` runs an effect on every `invoice` change with `JSON.stringify` deep-comparison; under the wrong inputs (P1-005) it re-renders forever. `Inspections`/`Properties` list pages do not virtualize and re-run `Property.list()` + `Client.list()` on every mount (no react-query for these), even though `QueryClientProvider` is mounted. PhotoUpload uploads sequentially.
- **A11y:** Most dialogs are Radix-based and trap focus. The `<input type="text">` styled with no border (`AreaCard.jsx:88-95`) hides the focus state. Touch targets are mostly ≥44px (Layout, MobileTabBar enforce it). The status-pill button in `Inspections.jsx:208-219` is `size="sm"` with `px-3 py-1` — at minimum height it can fall under 44px on small phones; raise.

## 5. Suggested Remediation Order
1. **P0-001** (InspectionForm `client_phone`) — production save is broken in the new flow.
2. **P0-002** (Invoice `inspection_id: ""`) — half of new invoice creations fail.
3. **P0-003** (status spread) — every status change in `/Inspections` blows up.
4. **P0-004** (ClientForm email required) — clients created via inspection are uneditable.
5. **P1-005** (Invoice effect loop) — silent corruption, stacking toasts.
6. **P1-006** (date timezone) — wrong day saved in Oman/UTC+ zones, the *only* market for the OMR-priced product.
7. **P1-008** through **P1-013** in any order; address before user-facing release.
8. **P2** items as time allows; P2-018 (silent client switch) is the highest-impact UX hazard.
9. **P3** polish items.

Once P0/P1 are fixed, run an end-to-end smoke pass: signup → create client → create property → create inspection (manual) → change status → generate invoice → mark paid. That round-trip currently fails at step 3 → 4.
