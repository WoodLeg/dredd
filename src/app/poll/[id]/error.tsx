"use client";

import { DreddFullPage } from "@/components/ui/dredd-full-page";

export default function PollError() {
  return (
    <DreddFullPage
      message="Dossier inaccessible"
      description="Les archives du Tribunal sont temporairement hors service. Réessayez ultérieurement, citoyen."
      action={{ label: "Retour au Tribunal", href: "/" }}
    />
  );
}
