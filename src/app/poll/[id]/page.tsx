import { cache, ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import type { Metadata } from "next";
import { getPollMeta, getVoterCount, hasVoted } from "@/lib/store";
import { auth } from "@/lib/auth";
import { PollPageClient } from "./poll-page-client";

const getCachedPollMeta = cache((id: string) => getPollMeta(id));

interface PollPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(
  { params }: PollPageProps
): Promise<Metadata> {
  const { id } = await params;
  const poll = await getCachedPollMeta(id);

  return {
    title: poll ? `${poll.question} — Dredd` : "Dossier introuvable — Dredd",
    description: poll
      ? `Prononcez votre verdict sur : ${poll.question}. Jugement Majoritaire — Tribunal de Mega-City One.`
      : "Tribunal de Mega-City One — Jugement Majoritaire.",
    openGraph: {
      title: poll?.question ?? "Dredd — Tribunal de Mega-City One",
      description: "Prononcez votre verdict. Jugement Majoritaire.",
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Dredd" }],
      type: "website",
      locale: "fr_FR",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function PollPage({ params }: PollPageProps) {
  const { id } = await params;

  const [session, poll] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getCachedPollMeta(id),
  ]);

  if (!session) {
    redirect(`/login?callbackUrl=/poll/${id}`);
  }

  if (!poll) {
    notFound();
  }

  const [voterCount, userHasVoted] = await Promise.all([
    getVoterCount(id),
    hasVoted(id, session.user.id),
  ]);

  const isOwner = session.user.id === poll.ownerId;

  const pollData = {
    id: poll.id,
    question: poll.question,
    candidates: poll.candidates,
    voterCount,
    isClosed: poll.isClosed,
    createdAt: poll.createdAt,
    hasVoted: userHasVoted,
    isOwner,
  };

  return (
    <ViewTransition>
      <PollPageClient poll={pollData} />
    </ViewTransition>
  );
}
