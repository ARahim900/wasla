/**
 * Brand tokens for exported reports (PDF / standalone HTML).
 *
 * The app proper consumes Tailwind/CSS-variable tokens, but generated
 * report HTML runs detached from those variables, so we mirror the
 * brand here. Keep these in sync with index.css :root and tailwind.config.js.
 */
export const REPORT_TOKENS = {
  brand: {
    primary: '#059669',       // Wasla emerald — primary brand
    primaryDark: '#047857',   // emerald-700, headings on light bg
    primaryDeep: '#064e3b',   // emerald-900, page header bg
  },
  status: {
    pass: '#059669',
    fail: '#dc2626',
    na: '#6b7280',
  },
  neutral: {
    bg: '#f9fafb',
    surface: '#ffffff',
    border: '#e5e7eb',
    borderStrong: '#d1d5db',
    textPrimary: '#111827',
    textSecondary: '#374151',
    textMuted: '#6b7280',
  },
};

/** Inline these as :root CSS variables inside a generated report's <style>. */
export const REPORT_CSS_VARS = `
  --brand-primary: ${REPORT_TOKENS.brand.primary};
  --brand-primary-dark: ${REPORT_TOKENS.brand.primaryDark};
  --brand-primary-deep: ${REPORT_TOKENS.brand.primaryDeep};
  --status-pass: ${REPORT_TOKENS.status.pass};
  --status-fail: ${REPORT_TOKENS.status.fail};
  --status-na: ${REPORT_TOKENS.status.na};
  --neutral-bg: ${REPORT_TOKENS.neutral.bg};
  --neutral-surface: ${REPORT_TOKENS.neutral.surface};
  --neutral-border: ${REPORT_TOKENS.neutral.border};
  --neutral-border-strong: ${REPORT_TOKENS.neutral.borderStrong};
  --text-primary: ${REPORT_TOKENS.neutral.textPrimary};
  --text-secondary: ${REPORT_TOKENS.neutral.textSecondary};
  --text-muted: ${REPORT_TOKENS.neutral.textMuted};
`;
