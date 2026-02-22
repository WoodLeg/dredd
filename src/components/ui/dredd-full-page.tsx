import { PageLayout } from "@/components/page-layout";
import { JudgeDredd } from "@/app/icons/dredd/judge";
import { Button } from "./button";

interface DreddFullPageProps {
  message: string;
  description?: string;
  action?: { label: string; href: string };
}

export function DreddFullPage({
  message,
  description,
  action,
}: DreddFullPageProps) {
  return (
    <PageLayout>
      <div className="w-full max-w-lg flex flex-col items-center gap-6 animate-fade-in-up">
        {/* Speech bubble */}
        <div
          className="relative w-full hud-card px-6 py-5"
          style={{ ["--hud-border"]: "rgba(255,0,64,0.5)", ["--hud-bg"]: "rgba(13,17,23,0.95)" }}
        >
          <h1 className="text-xl font-heading font-bold uppercase tracking-wider text-foreground">{message}</h1>
          {description && (
            <p className="mt-2 text-sm text-muted leading-relaxed">
              {description}
            </p>
          )}
          {/* Bubble tail pointing down */}
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[12px] border-t-[#ff0040]/50" />
        </div>

        {/* Judge Dredd character */}
        <div className="w-[300px] h-[240px] opacity-90 [&_svg]:w-full [&_svg]:h-full">
          <JudgeDredd />
        </div>

        {action && (
          <Button href={action.href} variant="secondary" size="md">
            {action.label}
          </Button>
        )}
      </div>
    </PageLayout>
  );
}
