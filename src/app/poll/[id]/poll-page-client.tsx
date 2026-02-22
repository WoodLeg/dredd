"use client";

import { useState } from "react";
import Link from "next/link";
import { VoteForm } from "@/components/vote-form";
import { ShareLink } from "@/components/share-link";
import { PageLayout } from "@/components/page-layout";
import { Button } from "@/components/ui/button";
import { DreddFullPage } from "@/components/ui/dredd-full-page";
import type { PollData } from "@/lib/types";

interface PollPageClientProps {
  poll: PollData;
}

export function PollPageClient({ poll }: PollPageClientProps) {
  const [voted, setVoted] = useState(false);

  // Already voted (server-side check) or just voted (client-side)
  if (poll.hasVoted || voted) {
    return (
      <PageLayout>
        <main className="w-full max-w-lg flex flex-col gap-6 items-center text-center animate-fade-in-up">
          <h1 className="text-2xl font-heading font-bold uppercase tracking-wider crt-flicker">
            {poll.question}
          </h1>
          <p className="text-muted">
            Verdict enregistré dans les archives judiciaires. Votre déposition est irrévocable, citoyen.
          </p>
          {poll.isClosed ? (
            <Button href={`/poll/${poll.id}/results`} size="lg">
              Accéder au verdict
            </Button>
          ) : (
            <p className="text-sm text-muted">
              Délibération en cours. Le Juge en Chef prononcera la sentence.
            </p>
          )}
          {poll.isOwner && (
            <Link
              href={`/poll/${poll.id}/admin`}
              className="text-sm text-neon-cyan hover:underline"
            >
              Accéder au poste de commandement
            </Link>
          )}
          <div className="w-full border-t border-border pt-6">
            <ShareLink pollId={poll.id} />
          </div>
        </main>
      </PageLayout>
    );
  }

  // Poll closed, not voted
  if (poll.isClosed) {
    return (
      <DreddFullPage
        message={poll.question}
        description="Audience terminée. La Loi a statué. Aucune déposition supplémentaire ne sera acceptée."
        action={{ label: "Accéder au verdict", href: `/poll/${poll.id}/results` }}
      />
    );
  }

  // Poll open, authenticated, not voted — show vote form
  return (
    <PageLayout>
      <main className="w-full max-w-lg flex flex-col gap-8 animate-fade-in-up">
        <VoteForm
          pollId={poll.id}
          question={poll.question}
          candidates={poll.candidates}
          onVoted={() => setVoted(true)}
        />
        {poll.isOwner && (
          <Link
            href={`/poll/${poll.id}/admin`}
            className="text-sm text-neon-cyan hover:underline text-center"
          >
            Accéder au poste de commandement
          </Link>
        )}
        <div className="border-t border-border pt-6">
          <ShareLink pollId={poll.id} />
        </div>
      </main>
    </PageLayout>
  );
}
