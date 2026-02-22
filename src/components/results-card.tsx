"use client";

import type { CandidateResult } from "@/lib/types";
import { GradeBadge } from "./grade-badge";
import { ResultsChart } from "./results-chart";

interface ResultsCardProps {
  result: CandidateResult;
  totalVotes: number;
  isWinner: boolean;
  index: number;
}

export function ResultsCard({
  result,
  totalVotes,
  isWinner,
  index,
}: ResultsCardProps) {
  return (
    <div
      data-testid="results-card"
      className="hud-card p-5 flex flex-col gap-3 animate-fade-in-up"
      style={{
        animationDelay: `${index * 0.1}s`,
        animationDuration: "0.4s",
        ["--hud-border"]: isWinner ? "rgba(0,240,255,0.3)" : "var(--color-border)",
        ["--hud-bg"]: isWinner ? "rgba(0,240,255,0.05)" : "var(--color-surface)",
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {isWinner && (
            <span
              className="text-xl"
              style={{
                animation: `scale-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.1 + 0.3}s both`,
              }}
            >
              &#x1f3c6;
            </span>
          )}
          <span className="font-semibold text-lg truncate">
            {result.name}
          </span>
        </div>
        <GradeBadge grade={result.medianGrade} />
      </div>

      <ResultsChart
        gradeDistribution={result.gradeDistribution}
        totalVotes={totalVotes}
        delay={index * 0.1}
      />
    </div>
  );
}
