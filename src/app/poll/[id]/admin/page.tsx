import { ViewTransition } from "react";
import { notFound, redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getPollMeta, getVoterCount } from "@/lib/store";
import { DreddFullPage } from "@/components/ui/dredd-full-page";
import { AdminPageClient } from "./admin-page-client";

interface AdminPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  const { id } = await params;

  const [session, poll] = await Promise.all([
    auth.api.getSession({ headers: await headers() }),
    getPollMeta(id),
  ]);

  if (!session) {
    redirect(`/login?callbackUrl=/poll/${id}/admin`);
  }

  if (!poll) {
    notFound();
  }

  if (poll.ownerId !== session.user.id) {
    return (
      <ViewTransition>
        <DreddFullPage
          message="Accès non autorisé"
          description="Identification invalide. Zone restreinte — accès réservé aux Juges en Chef."
          action={{ label: "Retour à l'audience", href: `/poll/${id}` }}
        />
      </ViewTransition>
    );
  }

  const voterCount = await getVoterCount(id);

  const pollData = {
    id: poll.id,
    question: poll.question,
    voterCount,
    isClosed: poll.isClosed,
  };

  return (
    <ViewTransition>
      <AdminPageClient poll={pollData} />
    </ViewTransition>
  );
}
