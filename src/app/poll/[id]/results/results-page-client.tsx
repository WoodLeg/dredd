"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react";
import type { PollResults } from "@/lib/types";
import { GRADE_MAP } from "@/lib/grades";
import { GradeBadge } from "@/components/grade-badge";
import { ResultsCard } from "@/components/results-card";
import { ShareLink } from "@/components/share-link";
import { PageLayout } from "@/components/page-layout";
import { JudgeDredd } from "@/app/icons/dredd/judge";
// ─── Types ────────────────────────────────────────────────────────────────────

type CeremonyPhase = "DELIBERATING" | "VERDICT" | "FULL_RESULTS";

interface ResultsPageClientProps {
  results: PollResults;
  pollId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCeremonySeenKey(pollId: string): string {
  return `ceremony_seen_${pollId}`;
}

function hasCeremonySeen(pollId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(getCeremonySeenKey(pollId)) === "1";
  } catch {
    return false;
  }
}

function markCeremonySeen(pollId: string): void {
  try {
    localStorage.setItem(getCeremonySeenKey(pollId), "1");
  } catch {
    /* localStorage unavailable */
  }
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ResultsPageClient({ results, pollId }: ResultsPageClientProps) {
  // Always start as DELIBERATING to avoid hydration mismatch.
  // The skip-ceremony check runs in a useEffect after hydration.
  const [phase, setPhase] = useState<CeremonyPhase>("DELIBERATING");

  const winners = results.ranking.filter((r) => r.rank === 1);

  const skipToResults = useCallback(() => {
    markCeremonySeen(pollId);
    setPhase("FULL_RESULTS");
  }, [pollId]);

  // Post-hydration check: skip ceremony if zero votes, already seen, or reduced motion
  useEffect(() => {
    const shouldSkip =
      results.totalVotes === 0 ||
      hasCeremonySeen(pollId) ||
      prefersReducedMotion();

    if (shouldSkip) {
      // Intentional: sync state from localStorage/media query after hydration
      setPhase("FULL_RESULTS"); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, [results.totalVotes, pollId]);

  // Phase auto-advance timers
  useEffect(() => {
    if (phase === "DELIBERATING") {
      const timer = setTimeout(() => setPhase("VERDICT"), 3000);
      return () => clearTimeout(timer);
    }

    if (phase === "VERDICT") {
      const timer = setTimeout(() => {
        markCeremonySeen(pollId);
        setPhase("FULL_RESULTS");
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [phase, pollId]);

  // ── Phase 1: Deliberating ─────────────────────────────────────────────────

  if (phase === "DELIBERATING") {
    return (
      <PageLayout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-8 text-center"
        >
          <div className="w-[200px] h-[160px] [&_svg]:w-full [&_svg]:h-full animate-pulse" aria-hidden="true">
            <JudgeDredd />
          </div>

          <div className="flex flex-col gap-3">
            <h1 className="text-2xl sm:text-3xl font-heading font-bold uppercase tracking-wider text-neon-cyan">
              Délibération en cours...
            </h1>
            <p className="text-muted text-sm">
              Le Tribunal de Mega-City One examine les dépositions.
            </p>
          </div>

          {/* Scan-line pulse animation */}
          <div className="w-48 h-1 bg-surface-light overflow-hidden rounded-full">
            <motion.div
              className="h-full bg-neon-cyan"
              initial={{ x: "-100%" }}
              animate={{ x: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <button
            onClick={skipToResults}
            className="text-sm text-muted hover:text-neon-cyan transition-colors cursor-pointer mt-4"
          >
            Passer au verdict
          </button>
        </motion.div>
      </PageLayout>
    );
  }

  // ── Phase 2: Verdict Announcement ─────────────────────────────────────────

  if (phase === "VERDICT") {
    return (
      <PageLayout>
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="flex flex-col items-center gap-8 text-center max-w-lg w-full"
        >
          <div className="w-[160px] h-[128px] [&_svg]:w-full [&_svg]:h-full" aria-hidden="true">
            <JudgeDredd />
          </div>

          <div className="flex flex-col gap-4 w-full">
            <p className="text-sm font-heading uppercase tracking-widest text-muted">
              Le verdict est tombé
            </p>

            <AnimatePresence>
              {winners.map((winner, i) => (
                <motion.div
                  key={winner.name}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.2 + 0.3, duration: 0.5 }}
                  className="hud-card p-6 flex flex-col items-center gap-3"
                  style={{
                    ["--hud-border"]: `${GRADE_MAP[winner.medianGrade].color}60`,
                    ["--hud-bg"]: "rgba(0,240,255,0.03)",
                  }}
                >
                  <span className="text-3xl">&#x1f3c6;</span>
                  <h2 className="text-xl sm:text-2xl font-heading font-bold uppercase tracking-wider">
                    {winner.name}
                  </h2>
                  <GradeBadge grade={winner.medianGrade} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          <button
            onClick={skipToResults}
            className="text-sm text-muted hover:text-neon-cyan transition-colors cursor-pointer mt-4"
          >
            Voir le détail complet
          </button>
        </motion.div>
      </PageLayout>
    );
  }

  // ── Phase 3: Full Results ─────────────────────────────────────────────────

  return (
    <PageLayout>
      <main className="w-full max-w-lg flex flex-col gap-8 animate-fade-in-up">
        <div>
          <h1
            className="text-2xl font-heading font-bold uppercase tracking-wider mb-1 animate-fade-in-up crt-flicker"
            style={{ animationDelay: "0.2s" }}
          >
            {results.question}
          </h1>
          <p className="text-muted text-sm">
            {results.totalVotes === 0
              ? "Aucune déposition enregistrée"
              : `${results.totalVotes} déposition${results.totalVotes > 1 ? "s" : ""}`}
          </p>
        </div>

        {results.totalVotes > 0 && (
          <div className="flex flex-col gap-4">
            {results.ranking.map((result, i) => (
              <ResultsCard
                key={result.name}
                result={result}
                totalVotes={results.totalVotes}
                isWinner={result.rank === 1}
                index={i}
              />
            ))}
          </div>
        )}

        <div className="border-t border-border pt-6 flex flex-col gap-4">
          <ShareLink pollId={pollId} />
          <Link
            href="/dashboard"
            className="text-sm text-muted hover:text-neon-cyan transition-colors text-center"
          >
            Ouvrir un nouveau dossier
          </Link>
        </div>
      </main>
    </PageLayout>
  );
}
