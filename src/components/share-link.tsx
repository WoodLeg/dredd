"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Button } from "./ui/button";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";

const QRCodeDisplay = dynamic(() => import("./qr-code-display").then(m => ({ default: m.QRCodeDisplay })), {
  ssr: false,
});

interface ShareLinkProps {
  pollId: string;
}

export function ShareLink({ pollId }: ShareLinkProps) {
  const { showDredd } = useDreddFeedback();
  const [url, setUrl] = useState(`/poll/${pollId}`);

  useEffect(() => {
    setUrl(`${window.location.origin}/poll/${pollId}`);
  }, [pollId]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      showDredd({ message: "Transmission inter-secteurs validée.", variant: "success" });
    } catch {
      // clipboard not available
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm text-muted font-heading uppercase tracking-wider text-xs">Transmission inter-secteurs</label>
      <div className="flex gap-2">
        <div
          className="flex-1 hud-card px-4 py-2.5 text-sm text-foreground truncate select-all font-mono"
          style={{ ["--hud-border"]: "rgba(0,240,255,0.2)", ["--hud-bg"]: "var(--color-surface)" }}
        >
          {url}
        </div>
        <Button variant="secondary" onClick={handleCopy}>
          Copier
        </Button>
      </div>
      <div className="flex justify-center pt-3 border-t border-[rgba(0,240,255,0.1)]">
        <QRCodeDisplay url={url} />
      </div>
    </div>
  );
}
