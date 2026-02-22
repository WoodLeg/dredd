import { PageLayout } from "@/components/page-layout";
import { DreddHelmetIcon } from "./dredd-helmet-icon";

interface CinematicLoaderProps {
  status: string;
  detail?: string;
  showProgress?: boolean;
}

const hudStyle = {
  "--hud-border": "rgba(0,240,255,0.3)",
  "--hud-bg": "rgba(13,17,23,0.95)",
} as React.CSSProperties;

export function CinematicLoader({
  status,
  detail,
  showProgress = true,
}: CinematicLoaderProps): React.ReactElement {
  return (
    <PageLayout>
      <div
        className="hud-card w-full max-w-lg px-8 py-10 flex flex-col items-center gap-5 loader-frame-in"
        style={hudStyle}
      >
        <div className="loader-helmet-in">
          <DreddHelmetIcon size={64} className="loader-helmet-glow" />
        </div>

        <div className="flex flex-col items-center gap-2">
          <p
            role="status"
            aria-live="polite"
            className="font-heading font-bold text-xl uppercase tracking-wider text-neon-cyan loader-text-reveal"
          >
            {status}
            <span className="loader-cursor" aria-hidden="true">
              _
            </span>
          </p>
          {detail && (
            <p className="text-xs text-muted tracking-wide loader-text-reveal-delayed">
              {detail}
            </p>
          )}
        </div>

        {showProgress && (
          <div className="w-48 h-1 bg-surface-light overflow-hidden rounded-full loader-bar-in">
            <div className="h-full w-full bg-neon-cyan loader-bar-sweep" />
          </div>
        )}
      </div>
    </PageLayout>
  );
}
