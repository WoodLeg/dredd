"use client";

import { useEffect, useRef } from "react";
import { GRADES } from "@/lib/grades";
import type { Grade } from "@/lib/types";

interface ResultsChartProps {
  gradeDistribution: Record<Grade, number>;
  totalVotes: number;
  delay?: number;
}

export function ResultsChart({
  gradeDistribution,
  totalVotes,
  delay = 0,
}: ResultsChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      containerRef.current.querySelectorAll<HTMLDivElement>("[data-bar]").forEach((bar) => {
        bar.style.width = bar.dataset.target || "0%";
      });
      return;
    }

    const timeout = setTimeout(() => {
      if (!containerRef.current) return;
      containerRef.current.querySelectorAll<HTMLDivElement>("[data-bar]").forEach((bar) => {
        bar.style.width = bar.dataset.target || "0%";
      });
    }, (delay + 0.1) * 1000);

    return () => clearTimeout(timeout);
  }, [delay]);

  if (totalVotes === 0) return null;

  return (
    <div
      ref={containerRef}
      className="flex h-5 w-full overflow-hidden hud-clip bg-surface-light"
    >
      {GRADES.map((g) => {
        const count = gradeDistribution[g.key] || 0;
        const pct = (count / totalVotes) * 100;
        if (pct === 0) return null;

        return (
          <div
            key={g.key}
            data-bar=""
            data-target={`${pct}%`}
            className="h-full relative group bar-animate"
            style={{ backgroundColor: g.color, width: 0, boxShadow: `0 0 8px ${g.color}66` }}
            title={`${g.label}: ${count} déposition${count > 1 ? "s" : ""} (${Math.round(pct)}%)`}
          />
        );
      })}
    </div>
  );
}
