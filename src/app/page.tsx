import { ViewTransition } from "react";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { PageLayout } from "@/components/page-layout";

export const metadata = {
  title: "Dredd — Tribunal de Mega-City One",
  description:
    "Jugement Majoritaire : soumettez vos litiges au tribunal. Chaque juge note chaque suspect, la mention médiane fait loi.",
};

export default async function Home() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (session) {
    redirect("/dashboard");
  }

  return (
    <ViewTransition>
      <PageLayout className="relative overflow-hidden">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-[url('/background.webp')] bg-cover bg-center bg-no-repeat opacity-20 pointer-events-none"
          aria-hidden="true"
        />

        <main className="relative z-10 w-full max-w-lg flex flex-col gap-10 animate-fade-in-up">
          {/* Hero section */}
          <div className="flex flex-col gap-4 text-center items-center">
            <h1
              className="text-5xl sm:text-6xl font-heading font-black tracking-widest uppercase glitch-title"
              data-text="DREDD"
            >
              DREDD
            </h1>
            <p className="text-lg text-muted max-w-md">
              Tribunal de Mega-City One. Soumettez un litige au Jugement
              Majoritaire — la mention médiane fait loi.
            </p>
            <Link
              href="/le-code"
              className="inline-flex items-center gap-2 text-sm text-neon-cyan border border-neon-cyan/40 px-4 py-2 hover:border-neon-cyan hover:shadow-[0_0_12px_rgba(0,240,255,0.3)] transition-all"
            >
              <span className="font-heading text-xs uppercase tracking-wider">
                Le Code
              </span>
              <span className="text-muted">
                — Comprendre le Jugement Majoritaire
              </span>
            </Link>
          </div>

          {/* Separator */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

          {/* Login CTA */}
          <div className="flex flex-col gap-4 items-center text-center">
            <p className="text-muted text-sm">
              Identifiez-vous pour accéder au Tribunal et ouvrir vos audiences.
            </p>
            <Button href="/login?callbackUrl=/dashboard" size="lg">
              Accéder au Tribunal
            </Button>
          </div>
        </main>
      </PageLayout>
    </ViewTransition>
  );
}
