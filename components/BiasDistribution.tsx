"use client";

import React from "react";

type BiasDistributionProps = {
  left: number;
  center: number;
  right: number;
  unrated?: number; // excluded from percentage calc; optional display only
  className?: string;
  title?: string; // e.g., "Bias Distribution"
};

function pct(n: number, denom: number) {
  if (denom <= 0) return 0;
  return (n / denom) * 100;
}

function round1(x: number) {
  return Math.round(x);
}

export default function BiasDistribution({
  left,
  center,
  right,
  unrated,
  className = "",
  title = "Bias Distribution",
}: BiasDistributionProps) {
  const rated = Math.max(left + center + right, 0);
  const pLeft = pct(left, rated);
  const pCenter = pct(center, rated);
  const pRight = pct(right, rated);

  // Summary “lean” label (majority side among L/C/R)
  let headline = "No Rated Sources";
  if (rated > 0) {
    const entries: Array<["Left" | "Center" | "Right", number]> = [
      ["Left", pLeft],
      ["Center", pCenter],
      ["Right", pRight],
    ];
    const top = entries.sort((a, b) => b[1] - a[1])[0];
    // Show as e.g., "57% Left"
    headline = `${round1(top[1])}% ${top[0]}`;
  }

  return (
    <section className={`w-full ${className}`}>
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
      </div>

      {/* Summary row */}
      <div className="flex items-center justify-between mb-2">
        <div className="text-2xl font-bold">{headline}</div>
        {typeof unrated === "number" && (
          <div className="text-sm text-muted-foreground">
            Unrated: <span className="font-medium">{unrated}</span>
          </div>
        )}
      </div>
      <div className="text-sm text-muted-foreground -mt-1 mb-3">
        Information Sources
      </div>

      {/* Line bar (stacked) */}
      <div
        className="h-3 w-full rounded-full bg-muted overflow-hidden ring-1 ring-black/5"
        role="img"
        aria-label={`Left ${round1(pLeft)} percent, Center ${round1(
          pCenter
        )} percent, Right ${round1(pRight)} percent`}
        title={`Left ${round1(pLeft)}% • Center ${round1(
          pCenter
        )}% • Right ${round1(pRight)}%`}
      >
        {/* Left */}
        <div
          className="h-full inline-block bg-blue-600"
          style={{ width: `${pLeft}%` }}
        />
        {/* Center */}
        <div
          className="h-full inline-block bg-gray-500"
          style={{ width: `${pCenter}%` }}
        />
        {/* Right */}
        <div
          className="h-full inline-block bg-red-600"
          style={{ width: `${pRight}%` }}
        />
      </div>

      {/* Labels under the bar */}
      <div className="mt-2 grid grid-cols-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-blue-600" />
          <span className="tabular-nums">Left {round1(pLeft)}%</span>
        </div>
        <div className="flex items-center justify-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-500" />
          <span className="tabular-nums">Center {round1(pCenter)}%</span>
        </div>
        <div className="flex items-center justify-end gap-2">
          <span className="inline-block h-2 w-2 rounded-full bg-red-600" />
          <span className="tabular-nums">Right {round1(pRight)}%</span>
        </div>
      </div>

      {/* Coverage details (optional mini table look) */}
      <div className="mt-4 grid grid-cols-4 gap-2 text-sm">
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">
            Total News Sources
          </div>
          <div className="font-medium tabular-nums">
            {left + center + right + (unrated ?? 0)}
          </div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Left</div>
          <div className="font-medium tabular-nums">{left}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Center</div>
          <div className="font-medium tabular-nums">{center}</div>
        </div>
        <div className="rounded-md border p-2">
          <div className="text-xs text-muted-foreground">Right</div>
          <div className="font-medium tabular-nums">{right}</div>
        </div>
      </div>
    </section>
  );
}
