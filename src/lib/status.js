/**
 * Centralized status color mappings for the entire app.
 * Uses semantic design tokens (via Tailwind) instead of hardcoded colors.
 *
 * Inspection statuses: scheduled, in_progress, completed, cancelled
 * Invoice statuses: draft, sent, paid, overdue, cancelled
 */

/** Badge classes for inspection statuses */
export const inspectionStatusColor = {
  scheduled: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  in_progress: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  completed: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
};

/** Badge classes for invoice statuses */
export const invoiceStatusColor = {
  draft: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  sent: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  paid: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  overdue: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  cancelled: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const fallback = "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

export function getInspectionStatusColor(status) {
  return inspectionStatusColor[status] || fallback;
}

export function getInvoiceStatusColor(status) {
  return invoiceStatusColor[status] || fallback;
}

/** Recharts / canvas colors mapped to status keys */
export const chartStatusColors = {
  scheduled: "#3b82f6",   // blue-500
  in_progress: "#f59e0b", // amber-500
  completed: "#10b981",   // emerald-500
  cancelled: "#ef4444",   // red-500
  other: "#8b5cf6",       // violet-500
};
