import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPollsByOwner, getVotesForPoll, getCachedResults, setCachedResults } from "@/lib/store";
import { computeResults } from "@/lib/majority-judgment";
import { DreddFullPage } from "@/components/ui/dredd-full-page";
import { DashboardPageClient } from "./dashboard-page-client";
import type { DashboardPollData, PollResults } from "@/lib/types";

export const metadata = {
  title: "Mes Dossiers — Dredd",
  description: "Tableau de bord du Juge — Tous vos dossiers en un coup d'œil.",
};

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    redirect("/login?callbackUrl=/dashboard");
  }

  const entries = await getPollsByOwner(session.user.id);

  if (entries.length === 0) {
    return (
      <ViewTransition>
        <DreddFullPage
          message="Aucun dossier enregistré"
          description="Votre casier judiciaire est vierge. Ouvrez votre première audience."
          action={{ label: "Ouvrir un dossier", href: "/" }}
        />
      </ViewTransition>
    );
  }

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
