// Single source of truth for inspection condition grading.
// The form (ItemRow) writes an explicit per-item grade; the report generator
// reads it and falls back to keyword inference for legacy Pass/Fail items.
//
// Scale: A (Good), B (Minor), C (Moderate), D (Major), E (Critical)

export const GRADES = ['A', 'B', 'C', 'D', 'E'];

export const GRADE_OPTIONS = [
  { value: 'A', label: 'A — Good condition' },
  { value: 'B', label: 'B — Minor (monitor)' },
  { value: 'C', label: 'C — Moderate (service/repair)' },
  { value: 'D', label: 'D — Major (repair required)' },
  { value: 'E', label: 'E — Critical (immediate action)' },
  { value: 'N/A', label: 'N/A — Not inspected' },
];

export const isValidGrade = (grade) =>
  typeof grade === 'string' && GRADES.includes(grade.trim().toUpperCase());

export const normalizeGrade = (grade) =>
  isValidGrade(grade) ? grade.trim().toUpperCase() : null;

// Keep the legacy status column in sync so pass-rate math, status badges,
// and older report consumers keep working.
export const statusFromGrade = (grade) => {
  const g = normalizeGrade(grade);
  if (g === 'A' || g === 'B') return 'Pass';
  if (g) return 'Fail';
  return 'N/A';
};

// Mirror of the report generator's severity inference so the form shows the
// same grade the report would print for legacy items saved before explicit
// grading existed.
export const inferGradeFromItem = (item) => {
  const status = (item?.status || '').toLowerCase();
  const comment = (item?.comments || '').toLowerCase();

  if (status === 'pass') {
    return comment && comment !== 'no comments' && comment !== 'no additional comments' ? 'B' : 'A';
  }
  if (status === 'n/a' || status === 'na' || !status) return null;

  // Fail — grade by severity keywords
  if (/safety|hazard|fire|gas|electric shock|exposed wir|short circuit|structural|collapse|severe|critical|urgent/.test(comment)) return 'E';
  if (/leak|mold|crack|broken|water damage|pest|infestation|major|not working|failed/.test(comment)) return 'D';
  if (/minor|small|hairline|cosmetic|stain|discolor|scratch|chip/.test(comment)) return 'C';
  return 'D';
};

// Severity-weighted score per grade, used for the report's overall grade.
// A critical defect should drag the score down far more than a cosmetic one.
export const GRADE_SCORE = { A: 100, B: 85, C: 60, D: 30, E: 0 };
