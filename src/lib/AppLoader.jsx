import React from "react";

export default function AppLoader({ label = "Loading…" }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className="fixed inset-0 flex items-center justify-center bg-background"
    >
      <div className="w-8 h-8 border-4 border-muted border-t-primary rounded-full animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
