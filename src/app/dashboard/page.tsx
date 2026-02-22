import { ViewTransition } from "react";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPollsByOwner, getVotesForPoll, getCachedResults, setCachedResults } from "@/lib/store";
import { computeResults } from "@/lib/majority-judgment";
import { DashboardPageClient } from "./dashboard-page-client";
import type { DashboardPollData, PollResults } from "@/lib/types";

export const metadata = {
  title: "Mes Dossiers — Dredd",
  description: "Tableau de bord du Juge — Tous vos dossiers en un coup d'œil.",
};

export default async function DashboardPage() {
  // Middleware guarantees authentication — this only fetches the session for user.id
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    throw new Error("Unreachable: middleware should have redirected unauthenticated request");
  }

  const entries = await getPollsByOwner(session.user.id);

  const dashboardPolls: DashboardPollData[] = await Promise.all(
    entries.map(async ({ meta, voterCount }) => {
      let winner: DashboardPollData["winner"] = undefined;
      if (meta.isClosed && voterCount > 0) {
        let results: PollResults;
        const cached = await getCachedResults(meta.id);
        if (cached) {
          results = cached;
        } else {
          const votes = await getVotesForPoll(meta.id);
          results = computeResults(meta.id, meta.question, meta.candidates, votes);
          await setCachedResults(meta.id, results);
        }
        const top = results.ranking[0];
        if (top) {
          winner = {
            name: top.name,
            medianGrade: top.medianGrade,
            gradeDistribution: top.gradeDistribution,
          };
        }
      }

      return {
        id: meta.id,
        question: meta.question,
        candidateCount: meta.candidates.length,
        voterCount,
        isClosed: meta.isClosed,
        createdAt: meta.createdAt,
        closedAt: meta.closedAt,
        winner,
      };
    })
  );

  return (
    <ViewTransition>
      <DashboardPageClient polls={dashboardPolls} />
    </ViewTransition>
  );
}
