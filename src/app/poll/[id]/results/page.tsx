import { cache, ViewTransition } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPoll, setCachedResults } from "@/lib/store";
import { computeResults } from "@/lib/majority-judgment";
import { DreddFullPage } from "@/components/ui/dredd-full-page";
import { ResultsPageClient } from "./results-page-client";

const getCachedPoll = cache((id: string) => getPoll(id));

interface ResultsPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: ResultsPageProps
): Promise<Metadata> {
  const { id } = await params;
  const poll = getCachedPoll(id);

  return {
    title: poll ? `Verdict : ${poll.question} — Dredd` : "Dossier introuvable — Dredd",
    description: poll
      ? `Verdict rendu : ${poll.question}. Jugement Majoritaire — Tribunal de Mega-City One.`
      : "Tribunal de Mega-City One — Jugement Majoritaire.",
    openGraph: {
      title: poll ? `Verdict : ${poll.question}` : "Dredd — Tribunal de Mega-City One",
      description: "Le verdict a été rendu. Jugement Majoritaire.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Dredd" }],
      type: "website",
      locale: "fr_FR",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function ResultsPage({ params }: ResultsPageProps) {
  const { id } = await params;
  const poll = getCachedPoll(id);

  if (!poll) {
    notFound();
  }

  if (!poll.isClosed) {
    return <ViewTransition><ResultsNotReady id={id} /></ViewTransition>;
  }

  const results = poll.cachedResults ?? computeResults(
    poll.id,
    poll.question,
    poll.candidates,
    poll.votes
  );

  if (!poll.cachedResults) {
    setCachedResults(id, results);
  }

  return (
    <ViewTransition>
      <ResultsPageClient results={results} pollId={id} />
    </ViewTransition>
  );
}

function ResultsNotReady({ id }: { id: string }) {
  return (
    <DreddFullPage
      message="Délibération en cours"
      description="En attente de la sentence du Juge en Chef. Patience, citoyen."
      action={{ label: "Retour à l'audience", href: `/poll/${id}` }}
    />
  );
}
