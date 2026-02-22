import { ViewTransition } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { JudgeDredd } from "@/app/icons/dredd/judge";
import { GradeBadge } from "@/components/grade-badge";
import { GRADES, GRADE_MAP } from "@/lib/grades";
import type { Grade } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ScrollSection, MedianDiagram } from "./le-code-client";

export const metadata: Metadata = {
  title: "Le Code — Jugement Majoritaire | Dredd",
  description:
    "Le système judiciaire de Mega-City One expliqué. Comprendre le Jugement Majoritaire.",
};

const GRADE_DESCRIPTIONS: { key: Grade; description: string }[] = [
  { key: "excellent", description: "Conduite irréprochable. Digne des plus hautes distinctions." },
  { key: "tres-bien", description: "Performance notable. Le Tribunal reconnaît vos mérites." },
  { key: "bien", description: "Conforme aux standards minimaux de la cité." },
  { key: "assez-bien", description: "Sous surveillance. Le moindre écart sera sanctionné." },
  { key: "passable", description: "Comportement douteux. Enquête en cours." },
  { key: "insuffisant", description: "Infraction avérée. Sanctions imminentes." },
  { key: "a-rejeter", description: "Sentence maximale. Aucune circonstance atténuante." },
];

const EXAMPLE_VOTE_KEYS: Grade[] = [
  "excellent", "tres-bien", "bien", "bien", "assez-bien", "passable", "a-rejeter",
];

const EXAMPLE_VOTES = EXAMPLE_VOTE_KEYS.map((key) => ({
  label: GRADE_MAP[key].label,
  color: GRADE_MAP[key].color,
  key,
}));

export default function LeCodePage() {
  return (
    <ViewTransition>
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-16">
        {/* ── Section 1: La Loi, c'est moi ── */}
        <ScrollSection>
          <section className="hud-card p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              <div
                className="w-[100px] h-[80px] sm:w-[120px] sm:h-[96px] shrink-0"
                aria-hidden="true"
              >
                <JudgeDredd />
              </div>
              <div className="flex flex-col gap-4">
                <h1
                  className="text-3xl sm:text-4xl font-heading font-black tracking-widest uppercase glitch-title text-neon-cyan"
                  data-text="Le Code"
                >
                  Le Code
                </h1>
                <p className="text-foreground leading-relaxed">
                  Citoyen. Bienvenue dans les archives classifiées du Tribunal de
                  Mega-City One. Ici, le chaos n&apos;a pas sa place. Chaque litige est
                  tranché par le{" "}
                  <span className="text-neon-cyan font-semibold">
                    Jugement Majoritaire
                  </span>{" "}
                  — un système où chaque Juge rend un verdict sur chaque suspect.
                  Pas de vote unique. Pas de compromis. La médiane fait loi.
                </p>
                <p className="text-muted text-sm">
                  Ce protocole remplace le scrutin uninominal, obsolète et corrompu.
                  Lisez attentivement. La connaissance du Code est obligatoire.
                </p>
              </div>
            </div>
          </section>
        </ScrollSection>

        {/* ── Section 2: Les Suspects ── */}
        <ScrollSection delay={0.05}>
          <section className="hud-card p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wider uppercase text-neon-magenta mb-4">
              Les Suspects
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              Dans chaque audience, un ou plusieurs suspects comparaissent devant
              le tribunal. Un suspect peut être une personne, une proposition, un
              projet — tout ce qui requiert un jugement collectif.
            </p>
            <div className="bg-surface-light p-4 rounded border border-border">
              <p className="text-sm text-foreground leading-relaxed">
                <span className="text-neon-cyan font-semibold">Règle fondamentale :</span>{" "}
                chaque Juge évalue{" "}
                <span className="italic text-neon-cyan">tous</span> les suspects.
                Il ne choisit pas un favori — il attribue une mention à chacun.
                C&apos;est ce qui distingue ce système du scrutin classique où l&apos;on ne
                coche qu&apos;un seul nom.
              </p>
            </div>
            <p className="text-muted text-sm mt-4">
              Exemple : si trois suspects comparaissent — Alpha, Bravo, Charlie —
              chaque Juge donne une mention à Alpha, une à Bravo, et une à Charlie.
              Aucun suspect n&apos;échappe à l&apos;évaluation.
            </p>
          </section>
        </ScrollSection>

        {/* ── Section 3: L'Échelle de Jugement ── */}
        <ScrollSection delay={0.05}>
          <section className="hud-card p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wider uppercase text-neon-magenta mb-4">
              L&apos;&Eacute;chelle de Jugement
            </h2>
            <p className="text-foreground leading-relaxed mb-6">
              Le Code prévoit sept mentions, de la plus favorable à la plus sévère.
              Chaque mention porte un poids, une couleur, une signification. Il
              n&apos;y a pas de demi-mesure dans Mega-City One.
            </p>
            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {GRADES.map((g) => (
                <GradeBadge key={g.key} grade={g.key} />
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {GRADE_DESCRIPTIONS.map((gd, i) => (
                <div
                  key={gd.key}
                  className={`flex items-start gap-2${i === GRADE_DESCRIPTIONS.length - 1 ? " sm:col-span-2 sm:justify-center" : ""}`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: GRADE_MAP[gd.key].color }}
                  />
                  <p className="text-muted">
                    <span className="text-foreground font-medium">{GRADE_MAP[gd.key].label}</span> —{" "}
                    {gd.description}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </ScrollSection>

        {/* ── Section 4: La Mention Majoritaire ── */}
        <ScrollSection delay={0.05}>
          <section className="hud-card p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wider uppercase text-neon-magenta mb-4">
              La Mention Majoritaire
            </h2>
            <p className="text-foreground leading-relaxed mb-4">
              Voici le coeur du système. Une fois que tous les Juges ont rendu
              leur verdict pour un suspect, les mentions sont triées de la meilleure
              à la pire. La mention du milieu — la{" "}
              <span className="text-neon-cyan font-semibold">médiane</span> —
              devient la sentence officielle du suspect.
            </p>

            <div className="bg-surface-light p-4 rounded border border-border mb-5">
              <p className="text-sm text-muted mb-3">
                <span className="text-foreground font-medium">Exemple :</span>{" "}
                7 Juges évaluent le Suspect X. Leurs verdicts, une fois triés :
              </p>
              <MedianDiagram grades={EXAMPLE_VOTES} medianIndex={3} />
            </div>

            <p className="text-foreground leading-relaxed mb-3">
              Avec 7 votes, la médiane est le 4e vote (la position centrale).
              Ici, le suspect obtient la mention{" "}
              <span
                className="font-semibold"
                style={{ color: GRADE_MAP["bien"].color }}
              >
                {GRADE_MAP["bien"].label}
              </span>
              . C&apos;est sa sentence.
            </p>
            <p className="text-muted text-sm">
              Pourquoi la médiane ? Parce qu&apos;elle garantit que{" "}
              <span className="text-foreground">
                la majorité des Juges estime que le suspect mérite au moins cette mention
              </span>
              . Un seul vote extrême ne peut pas faire basculer le résultat — la
              volonté collective prévaut.
            </p>
          </section>
        </ScrollSection>

        {/* ── Section 5: Pourquoi ce système ── */}
        <ScrollSection delay={0.05}>
          <section className="hud-card p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wider uppercase text-neon-magenta mb-4">
              Pourquoi ce système ?
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Le scrutin uninominal — &laquo; un citoyen, un choix &raquo; — est
              un reliquat de l&apos;Ancien Monde. Il est vulnérable à la manipulation,
              réducteur, et injuste. Le Jugement Majoritaire a été conçu pour
              corriger ces failles.
            </p>
            <div className="flex flex-col gap-4">
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan font-heading text-lg font-bold shrink-0 mt-0.5">
                  01
                </span>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    Résistant au vote stratégique
                  </p>
                  <p className="text-muted text-sm">
                    Voter &laquo; contre &raquo; un suspect en le sous-notant a un
                    impact limité sur la médiane. Le système récompense l&apos;honnêteté.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan font-heading text-lg font-bold shrink-0 mt-0.5">
                  02
                </span>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    Plus expressif
                  </p>
                  <p className="text-muted text-sm">
                    Sept mentions au lieu d&apos;un seul choix binaire. Chaque Juge
                    exprime un avis nuancé sur chaque suspect.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan font-heading text-lg font-bold shrink-0 mt-0.5">
                  03
                </span>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    L&apos;opinion majoritaire prévaut
                  </p>
                  <p className="text-muted text-sm">
                    La médiane reflète le jugement du groupe, pas celui d&apos;une minorité
                    bruyante. Une majorité de Juges doit estimer qu&apos;un suspect
                    mérite au moins sa mention finale.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-neon-cyan font-heading text-lg font-bold shrink-0 mt-0.5">
                  04
                </span>
                <div>
                  <p className="text-foreground font-medium mb-1">
                    Pas d&apos;effet spoiler
                  </p>
                  <p className="text-muted text-sm">
                    Ajouter un suspect supplémentaire ne pénalise pas les autres.
                    Chaque suspect est évalué indépendamment.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollSection>

        {/* ── Section 6: Procédure ── */}
        <ScrollSection delay={0.05}>
          <section className="hud-card p-6 sm:p-8">
            <h2 className="text-xl sm:text-2xl font-heading font-bold tracking-wider uppercase text-neon-magenta mb-4">
              Procédure
            </h2>
            <p className="text-foreground leading-relaxed mb-5">
              Appliquer le Code est simple. Trois étapes suffisent.
            </p>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex items-start gap-3">
                <span
                  className="text-sm font-heading font-bold px-2.5 py-1 rounded shrink-0"
                  style={{
                    backgroundColor: "rgba(0, 240, 255, 0.1)",
                    color: "#00f0ff",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                  }}
                >
                  1
                </span>
                <div>
                  <p className="text-foreground font-medium">Ouvrir l&apos;audience</p>
                  <p className="text-muted text-sm">
                    Le Juge en Chef crée un dossier : il définit la question et
                    les suspects.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="text-sm font-heading font-bold px-2.5 py-1 rounded shrink-0"
                  style={{
                    backgroundColor: "rgba(0, 240, 255, 0.1)",
                    color: "#00f0ff",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                  }}
                >
                  2
                </span>
                <div>
                  <p className="text-foreground font-medium">
                    Transmission inter-secteurs
                  </p>
                  <p className="text-muted text-sm">
                    Le lien sécurisé est transmis aux Juges. Chacun rend son
                    verdict en attribuant une mention à chaque suspect.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span
                  className="text-sm font-heading font-bold px-2.5 py-1 rounded shrink-0"
                  style={{
                    backgroundColor: "rgba(0, 240, 255, 0.1)",
                    color: "#00f0ff",
                    border: "1px solid rgba(0, 240, 255, 0.3)",
                  }}
                >
                  3
                </span>
                <div>
                  <p className="text-foreground font-medium">Verdict</p>
                  <p className="text-muted text-sm">
                    L&apos;audience est clôturée. Les mentions médianes sont calculées.
                    La sentence tombe. La Loi a parlé.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex justify-center">
              <Button href="/dashboard" size="lg">
                Ouvrir une audience
              </Button>
            </div>
          </section>
        </ScrollSection>

        {/* ── Footer ── */}
        <footer className="text-center pb-4">
          <p className="text-muted text-xs">
            Protocole de Jugement Majoritaire — Tribunal de Mega-City One
          </p>
          <p className="text-muted/50 text-xs mt-1">
            <Link href="/" className="hover:text-neon-cyan transition-colors">
              Retour au Tribunal
            </Link>
          </p>
        </footer>
      </div>
    </div>
    </ViewTransition>
  );
}
