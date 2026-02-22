"use client";

import { useRef, type ReactNode } from "react";
import { useInView } from "motion/react";

interface ScrollSectionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function ScrollSection({
  children,
  className = "",
  delay = 0,
}: ScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px 0px" });

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: isInView ? 1 : 0,
        transform: isInView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.6s ease-out ${delay}s, transform 0.6s ease-out ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

interface MedianDiagramProps {
  grades: { label: string; color: string }[];
  medianIndex: number;
}

export function MedianDiagram({ grades, medianIndex }: MedianDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px 0px" });

  return (
    <div ref={ref} className="flex flex-col gap-2">
      <div className="flex items-end gap-1.5 justify-center">
        {grades.map((g, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-1"
            style={{
              opacity: isInView ? 1 : 0,
              transform: isInView ? "translateY(0)" : "translateY(16px)",
              transition: `opacity 0.4s ease-out ${0.1 * i}s, transform 0.4s ease-out ${0.1 * i}s`,
            }}
          >
            <span className="text-[10px] text-muted font-mono">
              J{i + 1}
            </span>
            <div
              className={`w-8 sm:w-10 rounded-sm relative ${i === medianIndex ? "ring-2 ring-white ring-offset-2 ring-offset-background" : ""}`}
              style={{
                backgroundColor: g.color,
                height: `${40 + (grades.length - i) * 6}px`,
                boxShadow: i === medianIndex
                  ? `0 0 16px ${g.color}88, 0 0 32px ${g.color}44`
                  : `0 0 8px ${g.color}44`,
              }}
            />
            <span
              className="text-[9px] sm:text-[10px] font-medium leading-tight text-center w-10 sm:w-12"
              style={{ color: g.color }}
            >
              {g.label}
            </span>
          </div>
        ))}
      </div>
      <div
        className="text-center mt-3"
        style={{
          opacity: isInView ? 1 : 0,
          transition: "opacity 0.6s ease-out 0.8s",
        }}
      >
        <span className="text-xs text-muted">
          &uarr; Vote n&deg;{medianIndex + 1} = la{" "}
          <span className="text-neon-cyan font-semibold">
            mention m&eacute;diane
          </span>
        </span>
      </div>
    </div>
  );
}
