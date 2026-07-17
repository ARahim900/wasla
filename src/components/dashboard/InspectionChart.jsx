import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { chartStatusColors } from "@/lib/status";

// Lightweight dependency-free donut. Replaces recharts (~102 kB gzip) which was
// pulled onto the landing route just to draw this one status breakdown.

const SIZE = 176; // viewBox px
const STROKE = 28;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;
const GAP = 4; // px gap between segments along the circumference

const prettyStatus = (status) =>
  status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, " ");

const colorFor = (status) => chartStatusColors[status] || chartStatusColors.other;

export default function InspectionChart({ inspections, isLoading }) {
  const segments = React.useMemo(() => {
    if (!inspections?.length) return [];
    const counts = inspections.reduce((acc, i) => {
      const key = i.status || "other";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(counts).map(([status, value]) => ({
      status,
      value,
      name: prettyStatus(status),
      color: colorFor(status),
    }));
  }, [inspections]);

  const total = segments.reduce((sum, s) => sum + s.value, 0);

  // Build stroke-dasharray offsets around the circle for each segment.
  let acc = 0;
  const arcs = segments.map((s) => {
    const frac = s.value / total;
    const len = Math.max(frac * CIRC - GAP, 0);
    const arc = {
      ...s,
      dash: `${len} ${CIRC - len}`,
      offset: -acc * CIRC + GAP / 2,
      pct: Math.round(frac * 100),
    };
    acc += frac;
    return arc;
  });

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-foreground flex items-center gap-2">
          Inspection Status Overview
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : total > 0 ? (
          <div className="h-64 w-full flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
              <svg
                width={SIZE}
                height={SIZE}
                viewBox={`0 0 ${SIZE} ${SIZE}`}
                role="img"
                aria-label={`Inspection status breakdown, ${total} total`}
              >
                <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
                  {arcs.map((a) => (
                    <circle
                      key={a.status}
                      cx={SIZE / 2}
                      cy={SIZE / 2}
                      r={RADIUS}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={STROKE}
                      strokeDasharray={a.dash}
                      strokeDashoffset={a.offset}
                    >
                      <title>{`${a.name}: ${a.value} (${a.pct}%)`}</title>
                    </circle>
                  ))}
                </g>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-foreground leading-none">{total}</span>
                <span className="text-xs text-muted-foreground mt-1">Total</span>
              </div>
            </div>
            <ul className="space-y-2">
              {arcs.map((a) => (
                <li key={a.status} className="flex items-center gap-2 text-sm">
                  <span
                    className="inline-block w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: a.color }}
                    aria-hidden="true"
                  />
                  <span className="text-foreground">{a.name}</span>
                  <span className="text-muted-foreground ms-auto ps-4 tabular-nums">
                    {a.value} · {a.pct}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            No inspection data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
