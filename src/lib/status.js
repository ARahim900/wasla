/**
 * Centralized status color mappings for the entire app.
 * Uses semantic design tokens (via Tailwind) instead of hardcoded colors.
 *
 * Inspection statuses: scheduled, in_progress, completed, cancelled
 * Invoice statuses: draft, sent, paid, overdue, cancelled
 */

/** Badge classes for inspection statuses */
export const inspectionStatusColor = {
  scheduled: "bg-status-info-bg text-status-info-foreground",
  in_progress: "bg-status-warning-bg text-status-warning-foreground",
  completed: "bg-status-success-bg text-status-success-foreground",
  cancelled: "bg-status-danger-bg text-status-danger-foreground",
};

/** Badge classes for invoice statuses */
export const invoiceStatusColor = {
  draft: "bg-status-neutral-bg text-status-neutral-foreground",
  sent: "bg-status-info-bg text-status-info-foreground",
  paid: "bg-status-success-bg text-status-success-foreground",
  overdue: "bg-status-danger-bg text-status-danger-foreground",
  cancelled: "bg-status-neutral-bg text-status-neutral-foreground",
};

const fallback = "bg-status-neutral-bg text-status-neutral-foreground";

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
