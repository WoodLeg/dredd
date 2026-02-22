"use client";

import { useEffect, useRef } from "react";
import type QRCodeStyling from "qr-code-styling";

interface QRCodeDisplayProps {
  url: string;
}

const qrOptions = {
  width: 256,
  height: 256,
  type: "svg" as const,
  margin: 16,
  dotsOptions: {
    type: "rounded" as const,
    color: "#00f0ff",
  },
  backgroundOptions: { color: "#08080c" },
  cornersSquareOptions: {
    type: "extra-rounded" as const,
    color: "#00f0ff",
  },
  cornersDotOptions: { color: "#ff2d7b" },
  qrOptions: { errorCorrectionLevel: "H" as const },
};

export function QRCodeDisplay({ url }: QRCodeDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrRef = useRef<QRCodeStyling | null>(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    let cancelled = false;

    import("qr-code-styling").then(({ default: QRCodeStyling }) => {
      if (cancelled) return;

      if (!qrRef.current) {
        qrRef.current = new QRCodeStyling({ ...qrOptions, data: url });
        qrRef.current.append(node);
      } else {
        qrRef.current.update({ data: url });
      }
    });

    return () => {
      cancelled = true;
      node.innerHTML = "";
      qrRef.current = null;
    };
  }, [url]);

  return <div ref={containerRef} className="flex items-center justify-center" />;
}
