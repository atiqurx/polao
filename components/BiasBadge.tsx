import React from "react";
import clsx from "clsx";

export type Bias = "LEFT" | "CENTER" | "RIGHT" | "Unknown";

export default function BiasBadge({ label }: { label: Bias }) {
  const tone = (label || "Unknown").toUpperCase();
  const color =
    tone === "LEFT"
      ? "bg-blue-600"
      : tone === "RIGHT"
      ? "bg-red-600"
      : tone === "CENTER"
      ? "bg-gray-700"
      : "bg-gray-400";

  return (
    <span
      className={clsx(
        "inline-flex items-center px-2 py-1 rounded text-xs font-semibold text-white select-none",
        color
      )}
      aria-label={`Bias: ${tone}`}
      title={`Bias: ${tone}`}
    >
      {tone === "Unknown"
        ? "Center"
        : tone.charAt(0) + tone.slice(1).toLowerCase()}
    </span>
  );
}
