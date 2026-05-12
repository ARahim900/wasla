-- ============================================================
-- WASLA — Open shared workspace
-- All authenticated users get full CRUD on shared business data:
-- inspections, clients, properties, invoices.
--
-- Profiles remain private (per-user email/phone/address).
-- Storage SELECT on inspection-photos is already public.
-- INSERT policies untouched — creator's user_id is still stamped on every new row.
--
-- Policy-only change. No rows are modified, merged, or deleted.
-- Applied to production via Supabase MCP on 2026-05-12; verified zero row loss.
-- ============================================================

-- ===== INSPECTIONS =====
DROP POLICY IF EXISTS "Users can view their own inspections"   ON inspections;
DROP POLICY IF EXISTS "Users can update their own inspections" ON inspections;
DROP POLICY IF EXISTS "Users can delete their own inspections" ON inspections;

CREATE POLICY "Authenticated can view inspections"
  ON inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update inspections"
  ON inspections FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete inspections"
  ON inspections FOR DELETE TO authenticated USING (true);

-- ===== CLIENTS =====
DROP POLICY IF EXISTS "Users can view their own clients"   ON clients;
DROP POLICY IF EXISTS "Users can update their own clients" ON clients;
DROP POLICY IF EXISTS "Users can delete their own clients" ON clients;

CREATE POLICY "Authenticated can view clients"
  ON clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update clients"
  ON clients FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete clients"
  ON clients FOR DELETE TO authenticated USING (true);

-- ===== PROPERTIES =====
DROP POLICY IF EXISTS "Users can view their own properties"   ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;

CREATE POLICY "Authenticated can view properties"
  ON properties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update properties"
  ON properties FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete properties"
  ON properties FOR DELETE TO authenticated USING (true);

-- ===== INVOICES =====
DROP POLICY IF EXISTS "Users can view their own invoices"   ON invoices;
DROP POLICY IF EXISTS "Users can update their own invoices" ON invoices;
DROP POLICY IF EXISTS "Users can delete their own invoices" ON invoices;

CREATE POLICY "Authenticated can view invoices"
  ON invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can update invoices"
  ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete invoices"
  ON invoices FOR DELETE TO authenticated USING (true);
