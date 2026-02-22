"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { ShareLink } from "./share-link";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";

import { closePollAction } from "@/lib/actions";

interface AdminPanelProps {
  pollId: string;
  question: string;
  voterCount: number;
  isClosed: boolean;
}

export function AdminPanel({
  pollId,
  question,
  voterCount,
  isClosed: initialClosed,
}: AdminPanelProps) {
  const router = useRouter();
  const [isClosed, setIsClosed] = useState(initialClosed);
  const [confirming, setConfirming] = useState(false);
  const [closing, setClosing] = useState(false);
  const { showDredd } = useDreddFeedback();
  const [isRefreshing, startRefreshTransition] = useTransition();

  async function handleClose() {
    if (!confirming) {
      setConfirming(true);
      return;
    }

    setClosing(true);
    const result = await closePollAction({ pollId });

    if (!result.success) {
      if ("error" in result) {
        showDredd({ message: result.error, variant: "error" });
      }
      setConfirming(false);
      setClosing(false);
      return;
    }

    setIsClosed(true);
    setClosing(false);
    setConfirming(false);
  }

  function handleRefresh() {
    startRefreshTransition(() => {
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6 w-full">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase tracking-wider mb-1 crt-flicker">{question}</h1>
        <p className="text-muted text-sm">Poste de commandement — Juge en Chef</p>
      </div>

      <div
        className="hud-card p-4 flex flex-col gap-3"
        style={{ ["--hud-border"]: "rgba(0,240,255,0.2)", ["--hud-bg"]: "var(--color-surface)" }}
      >
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Statut de l&apos;audience</span>
          <span
            className={`text-sm font-medium ${isClosed ? "text-grade-a-rejeter" : "text-grade-excellent"}`}
            style={{ textShadow: isClosed ? "0 0 8px rgba(255,0,64,0.5)" : "0 0 8px rgba(57,255,20,0.5)" }}
          >
            {isClosed ? "Clôturé" : "En session"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Dépositions</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {voterCount} déposition{voterCount !== 1 ? "s" : ""}
            </span>
            {!isClosed && (
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="text-xs text-muted hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
              >
                {isRefreshing ? "..." : "scanner"}
              </button>
            )}
          </div>
        </div>
      </div>

      {!isClosed && (
        <div className="flex flex-col gap-2">
          <Button
            variant={confirming ? "primary" : "secondary"}
            size="lg"
            onClick={handleClose}
            disabled={closing}
          >
            {closing
              ? "Clôture en cours..."
              : confirming
                ? "Confirmer la sentence finale"
                : "Clôturer l'audience"}
          </Button>
          {confirming && (
            <>
              <p className="text-sm text-muted text-center">
                Sentence irréversible. Le verdict sera diffusé dans tous les secteurs de Mega-City One.
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirming(false)}
              >
                Annuler
              </Button>
            </>
          )}
        </div>
      )}

      {isClosed && (
        <Button href={`/poll/${pollId}/results`} size="lg">
          Accéder au verdict
        </Button>
      )}

      <div className="border-t border-border pt-6">
        <ShareLink pollId={pollId} />
      </div>

    </div>
  );
}
