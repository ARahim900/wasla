// Single source of truth for inspection condition status.
// Each inspected item carries a strict Pass / Fail / N/A condition.
//
// `statusFromGrade` keeps inspections saved before the switch (which stored an
// A–E letter grade) rendering correctly by mapping that legacy grade onto a
// status. New inspections write `status` directly.

export const STATUSES = ['Pass', 'Fail', 'N/A'];

export const STATUS_OPTIONS = [
  { value: 'Pass', label: 'Pass — meets standard' },
  { value: 'Fail', label: 'Fail — defect found' },
  { value: 'N/A', label: 'N/A — not inspected' },
];

// Normalize loose casing/spelling ("pass", "NA", "n/a ") to a canonical status.
export const normalizeStatus = (status) => {
  if (typeof status !== 'string') return null;
  const s = status.trim().toLowerCase();
  if (s === 'pass') return 'Pass';
  if (s === 'fail') return 'Fail';
  if (s === 'n/a' || s === 'na') return 'N/A';
  return null;
};

// Legacy A–E grade → status. A/B (good/minor) were effectively a pass; C and
// worse always needed work, so they map to a fail.
export const statusFromGrade = (grade) => {
  const g = typeof grade === 'string' ? grade.trim().toUpperCase() : '';
  if (g === 'A' || g === 'B') return 'Pass';
  if (g === 'C' || g === 'D' || g === 'E') return 'Fail';
  return null;
};

// Display status for an item: explicit status wins, then a legacy grade, then
// N/A as the safe default.
export const statusFromItem = (item) =>
  normalizeStatus(item?.status) || statusFromGrade(item?.grade) || 'N/A';
