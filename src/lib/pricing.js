// Single source of truth for inspection pricing.
// Update rates here; both InspectionForm preview and InvoiceForm line items
// read from this module.

export const RATE_PER_SQM = {
  villa: 1.0,
  apartment: 0.7,
  office: 2.0,
  building: 2.0,
};

export const formatPropertyType = (t) =>
  t ? t.charAt(0).toUpperCase() + t.slice(1) : '';

export const getRateForType = (type) => RATE_PER_SQM[type] || 0;

export const calculateInspectionFee = (areaSqm, propertyType) => {
  const area = Number(areaSqm);
  const rate = getRateForType(propertyType);
  if (!Number.isFinite(area) || area <= 0 || rate <= 0) return 0;
  return area * rate;
};
