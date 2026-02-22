import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPollsByOwner, getCachedResults, setCachedResults } from "@/lib/store";
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

  const polls = await getPollsByOwner(session.user.id);

  if (polls.length === 0) {
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
    polls.map(async (poll) => {
      let winner: DashboardPollData["winner"] = undefined;
      if (poll.isClosed && poll.votes.length > 0) {
        let results: PollResults;
        const cached = await getCachedResults(poll.id);
        if (cached) {
          results = cached;
        } else {
          results = computeResults(poll.id, poll.question, poll.candidates, poll.votes);
          await setCachedResults(poll.id, results);
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
        id: poll.id,
        question: poll.question,
        candidateCount: poll.candidates.length,
        voterCount: poll.votes.length,
        isClosed: poll.isClosed,
        createdAt: poll.createdAt,
        closedAt: poll.closedAt,
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
