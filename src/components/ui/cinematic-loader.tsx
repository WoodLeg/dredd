import { DreddHelmetIcon } from "./dredd-helmet-icon";

interface CinematicLoaderProps {
  status: string;
  detail?: string;
  showProgress?: boolean;
}

export function CinematicLoader({
  status,
  detail,
  showProgress = true,
}: CinematicLoaderProps): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg flex flex-col items-center gap-6">
        {/* Phase 1: HUD Frame draws in */}
        <div
          className="hud-card w-full px-8 py-10 flex flex-col items-center gap-5 loader-frame-in"
          style={
            {
              "--hud-border": "rgba(0,240,255,0.3)",
              "--hud-bg": "rgba(13,17,23,0.95)",
            } as React.CSSProperties
          }
        >
          {/* Phase 2: Helmet icon with neon glow */}
          <div className="loader-helmet-in">
            <DreddHelmetIcon size={64} className="loader-helmet-glow" />
          </div>

          {/* Phase 3: Status text with clip reveal */}
          <div className="flex flex-col items-center gap-2">
            <h1 className="font-heading font-bold text-lg uppercase tracking-widest text-neon-cyan loader-text-reveal">
              {status}
              <span className="loader-cursor" aria-hidden="true">
                _
              </span>
            </h1>
            {detail && (
              <p className="text-xs text-muted tracking-wide loader-text-reveal-delayed">
                {detail}
              </p>
            )}
          </div>

          {/* Phase 4: Neon progress bar (loops) */}
          {showProgress && (
            <div className="w-48 h-1 bg-surface-light overflow-hidden rounded-full loader-bar-in">
              <div className="h-full w-full bg-neon-cyan loader-bar-sweep" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
