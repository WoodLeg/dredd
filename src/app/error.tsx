"use client";

import { DreddFullPage } from "@/components/ui/dredd-full-page";

export default function GlobalError() {
  return (
    <DreddFullPage
      message="Tribunal indisponible"
      description="Dysfonctionnement critique des systèmes de Mega-City One. Réessayez ultérieurement, citoyen."
      action={{ label: "Retour au Tribunal", href: "/" }}
    />
  );
}
