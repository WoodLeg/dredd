"use client";

import { ViewTransition } from "react";
import { DreddFullPage } from "@/components/ui/dredd-full-page";

export default function GlobalError() {
  return (
    <ViewTransition>
      <DreddFullPage
        message="Tribunal indisponible"
        description="Dysfonctionnement critique des systèmes de Mega-City One. Réessayez ultérieurement, citoyen."
        action={{ label: "Retour au Tribunal", href: "/" }}
      />
    </ViewTransition>
  );
}
