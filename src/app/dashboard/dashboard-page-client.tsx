"use client";

import { useState } from "react";
import Link from "next/link";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";
import { GradeBadge } from "@/components/grade-badge";
import { ResultsChart } from "@/components/results-chart";
import type { DashboardPollData } from "@/lib/types";

function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return new Intl.DateTimeFormat("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(timestamp);
  }

  const rtf = new Intl.RelativeTimeFormat("fr", { numeric: "auto" });
  if (days > 0) return rtf.format(-days, "day");
  if (hours > 0) return rtf.format(-hours, "hour");
  if (minutes > 0) return rtf.format(-minutes, "minute");
  return rtf.format(-seconds, "second");
}

export function DashboardPageClient({ polls }: { polls: DashboardPollData[] }) {
  const { showDredd } = useDreddFeedback();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function handleCopy(pollId: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/poll/${pollId}`);
      showDredd({ message: "Coordonnées sécurisées transmises", variant: "success", autoDismissMs: 2000 });
      setCopiedId(pollId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      showDredd({ message: "Échec de la transmission", variant: "error", autoDismissMs: 2000 });
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-heading font-bold uppercase tracking-wider text-foreground mb-8">
        Mes Dossiers
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {polls.map((poll) => (
          <div
            key={poll.id}
            data-testid="dashboard-poll-card"
            className="hud-card hover:scale-[1.01] transition-transform"
            style={{
              ["--hud-border"]: poll.isClosed ? "rgba(255,0,64,0.3)" : "rgba(0,240,255,0.3)",
              ["--hud-bg"]: "var(--color-surface)",
            }}
          >
            <Link
              href={poll.isClosed ? `/poll/${poll.id}/results` : `/poll/${poll.id}/admin`}
              className="block p-5 pb-0"
            >
              <div className="flex justify-between items-start">
                {poll.isClosed ? (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-heading font-bold uppercase tracking-wider bg-neon-magenta/10 text-neon-magenta">
                    CLÔTURÉE
                  </span>
                ) : (
                  <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-heading font-bold uppercase tracking-wider bg-neon-cyan/10 text-neon-cyan">
                    OUVERTE
                  </span>
                )}
                <span className="text-xs text-muted">
                  {formatRelativeTime(poll.closedAt ?? poll.createdAt)}
                </span>
              </div>

              <h2 className="mt-3 text-lg font-heading font-bold text-foreground line-clamp-2">
                {poll.question}
              </h2>

              <p className="mt-2 text-sm text-muted">
                {poll.voterCount} déposition{poll.voterCount !== 1 ? "s" : ""} ·{" "}
                {poll.candidateCount} suspect{poll.candidateCount !== 1 ? "s" : ""}
              </p>

              {poll.winner && (
                <div className="mt-3 pt-3 border-t border-border/50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm text-muted truncate flex-1">
                      {poll.winner.name}
                    </span>
                    <GradeBadge grade={poll.winner.medianGrade} />
                  </div>
                  <ResultsChart
                    gradeDistribution={poll.winner.gradeDistribution}
                    totalVotes={poll.voterCount}
                  />
                </div>
              )}
            </Link>
            <div className="px-5 pb-5 pt-3">
              <button
                onClick={() => handleCopy(poll.id)}
                disabled={copiedId === poll.id}
                className="w-full text-center text-xs text-neon-cyan/70 hover:text-neon-cyan py-1.5 rounded-md hover:bg-neon-cyan/5 transition-colors disabled:opacity-50 disabled:cursor-default"
              >
                {copiedId === poll.id ? "Copié" : "Copier le lien"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
