import { ViewTransition } from "react";
import { DreddFullPage } from "@/components/ui/dredd-full-page";

export default function NotFound() {
  return (
    <ViewTransition>
    <DreddFullPage
      message="Secteur non répertorié"
      description="Ce secteur n'existe pas dans les archives de Mega-City One. Vérifiez vos coordonnées, citoyen."
      action={{ label: "Retour au Tribunal", href: "/" }}
    />
    </ViewTransition>
  );
}
