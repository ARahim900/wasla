-- ============================================================
-- WASLA — Shared read access across all authenticated users
-- All logged-in users can SELECT every row.
-- Only the row's creator can INSERT/UPDATE/DELETE their own rows.
-- Profiles remain private (each user sees only their own profile).
-- ============================================================

-- ---------- CLIENTS ----------
DROP POLICY IF EXISTS "Users can view their own clients" ON clients;
DROP POLICY IF EXISTS "All authenticated can view clients" ON clients;
CREATE POLICY "All authenticated can view clients"
  ON clients FOR SELECT
  TO authenticated
  USING (true);

-- ---------- PROPERTIES ----------
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "All authenticated can view properties" ON properties;
CREATE POLICY "All authenticated can view properties"
  ON properties FOR SELECT
  TO authenticated
  USING (true);

-- ---------- INSPECTIONS ----------
DROP POLICY IF EXISTS "Users can view their own inspections" ON inspections;
DROP POLICY IF EXISTS "All authenticated can view inspections" ON inspections;
CREATE POLICY "All authenticated can view inspections"
  ON inspections FOR SELECT
  TO authenticated
  USING (true);

-- ---------- INVOICES ----------
DROP POLICY IF EXISTS "Users can view their own invoices" ON invoices;
DROP POLICY IF EXISTS "All authenticated can view invoices" ON invoices;
CREATE POLICY "All authenticated can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

-- INSERT / UPDATE / DELETE policies remain scoped to auth.uid() = user_id
-- (already created by schema.sql) — only the creator can modify or delete.

-- Profiles policies are intentionally NOT changed — each user keeps their own
-- profile private (contains email/phone/address).
