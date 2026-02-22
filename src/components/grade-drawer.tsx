"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { GRADES } from "@/lib/grades";
import type { Grade } from "@/lib/types";

interface GradeDrawerProps {
  candidate: string;
  currentGrade: Grade | undefined;
  onSelect: (grade: Grade) => void;
  onClose: () => void;
}

export function GradeDrawer({
  candidate,
  currentGrade,
  onSelect,
  onClose,
}: GradeDrawerProps) {
  const prefersReduced = useReducedMotion();
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Body scroll lock
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Focus first grade button on mount
  useEffect(() => {
    firstButtonRef.current?.focus();
  }, []);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const springTransition = prefersReduced
    ? { duration: 0 }
    : { type: "spring" as const, damping: 22, stiffness: 260 };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Sélectionner un verdict pour ${candidate}`}
      className="fixed inset-0 z-50"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={prefersReduced ? { duration: 0 } : { duration: 0.2 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={springTransition}
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-border bg-surface/95 backdrop-blur-md px-4 pb-8 pt-4"
      >
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted/40" />

        {/* Candidate name header */}
        <h2 className="font-heading text-base font-bold uppercase tracking-wider text-foreground mb-4 text-center">
          {candidate}
        </h2>

        {/* Grade buttons */}
        <div className="flex flex-col gap-2">
          {GRADES.map((g, i) => {
            const selected = currentGrade === g.key;
            return (
              <button
                key={g.key}
                ref={i === 0 ? firstButtonRef : undefined}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelect(g.key)}
                className="w-full rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 cursor-pointer border"
                style={{
                  backgroundColor: selected ? g.color : "transparent",
                  borderColor: selected ? g.color : `${g.color}4D`,
                  color: selected
                    ? g.index <= 3
                      ? "#08080c"
                      : "#fff"
                    : `${g.color}B3`,
                  boxShadow: selected
                    ? `0 0 20px ${g.color}80, inset 0 0 12px ${g.color}30`
                    : "none",
                }}
              >
                {g.label}
              </button>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}

interface AnimatedGradeDrawerProps {
  activeCandidate: string | null;
  currentGrade: Grade | undefined;
  onSelect: (candidate: string, grade: Grade) => void;
  onClose: () => void;
  onExitComplete: () => void;
}

export function AnimatedGradeDrawer({
  activeCandidate,
  currentGrade,
  onSelect,
  onClose,
  onExitComplete,
}: AnimatedGradeDrawerProps) {
  return (
    <AnimatePresence onExitComplete={onExitComplete}>
      {activeCandidate && (
        <GradeDrawer
          key={activeCandidate}
          candidate={activeCandidate}
          currentGrade={currentGrade}
          onSelect={(grade) => onSelect(activeCandidate, grade)}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
