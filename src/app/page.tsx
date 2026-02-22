import { ViewTransition } from "react";
import Link from "next/link";
import { PollForm } from "@/components/poll-form";
import { PageLayout } from "@/components/page-layout";

export default function Home() {
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
            <span className="font-heading text-xs uppercase tracking-wider">Le Code</span>
            <span className="text-muted">— Comprendre le Jugement Majoritaire</span>
          </Link>
        </div>

        {/* Separator */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />

        {/* Poll creation form */}
        <PollForm />
      </main>
    </PageLayout>
    </ViewTransition>
  );
}
