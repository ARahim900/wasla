-- Add area_sqm (square meters) to properties and inspections.
-- Required by the inspection → invoice pricing flow introduced in PR #9.
-- The legacy properties.area_sqft column is left in place but is no longer
-- written by the app.

ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS area_sqm NUMERIC;

ALTER TABLE inspections
  ADD COLUMN IF NOT EXISTS area_sqm NUMERIC;
