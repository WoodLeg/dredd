"use client";

import { useState } from "react";
import { useForm, useWatch, type Control } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { GRADES } from "@/lib/grades";
import type { Grade } from "@/lib/types";
import { Button } from "./ui/button";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";
import { GradeBadge } from "@/components/grade-badge";
import { AnimatedGradeDrawer } from "@/components/grade-drawer";

import { voteSchema, type VoteInput } from "@/lib/schemas";
import { submitVoteAction } from "@/lib/actions";

interface CandidateGradeRowProps {
  candidate: string;
  control: Control<VoteInput>;
  onSelectGrade: (candidate: string, grade: Grade) => void;
}

function CandidateGradeRow({
  candidate,
  control,
  onSelectGrade,
}: CandidateGradeRowProps) {
  const selectedGrade = useWatch({ control, name: `grades.${candidate}` });

  return (
    <div className="flex flex-col gap-2">
      <span className="text-base font-medium font-heading uppercase tracking-wider text-sm">{candidate}</span>
      <div className="flex flex-wrap gap-1.5">
        {GRADES.map((g) => {
          const selected = selectedGrade === g.key;
          return (
            <button
              key={g.key}
              type="button"
              onClick={() => onSelectGrade(candidate, g.key)}
              className="rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer border hover:animate-[neon-pulse_1.5s_ease-in-out_infinite]"
              style={{
                backgroundColor: selected ? g.color : "transparent",
                borderColor: selected ? g.color : `${g.color}4D`,
                color: selected ? (g.index <= 3 ? "#08080c" : "#fff") : `${g.color}B3`,
                boxShadow: selected ? `0 0 16px ${g.color}80` : "none",
                ["--glow-color"]: `${g.color}66`,
              }}
            >
              {g.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface MobileSuspectRowProps {
  candidate: string;
  control: Control<VoteInput>;
  onTap: (candidate: string) => void;
}

function MobileSuspectRow({ candidate, control, onTap }: MobileSuspectRowProps) {
  const selectedGrade = useWatch({ control, name: `grades.${candidate}` });

  return (
    <button
      type="button"
      onClick={() => onTap(candidate)}
      className="flex w-full items-center justify-between min-h-12 px-3 py-3 border-b border-border/40 cursor-pointer transition-colors active:bg-surface-light/50"
    >
      <span className="font-heading text-sm font-medium uppercase tracking-wider text-foreground">
        {candidate}
      </span>
      {selectedGrade ? (
        <GradeBadge grade={selectedGrade as Grade} />
      ) : (
        <span className="text-xs text-muted italic">En attente de verdict</span>
      )}
    </button>
  );
}

interface VoteFormProps {
  pollId: string;
  question: string;
  candidates: string[];
  onVoted: () => void;
}

export function VoteForm({ pollId, question, candidates, onVoted }: VoteFormProps) {
  const { showDredd } = useDreddFeedback();
  const [authExpired, setAuthExpired] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState<string | null>(null);
  const [pendingCandidate, setPendingCandidate] = useState<string | null>(null);
  const {
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { isSubmitting },
  } = useForm<VoteInput>({
    resolver: zodResolver(voteSchema),
    defaultValues: {
      grades: {},
    },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const grades = watch("grades");
  const allGraded = candidates.every((c) => grades[c]);

  function selectGrade(candidate: string, grade: Grade) {
    setValue(`grades.${candidate}`, grade, { shouldValidate: true });
  }

  function handleSuspectTap(candidate: string) {
    if (activeCandidate) {
      setPendingCandidate(candidate);
      setActiveCandidate(null);
    } else {
      setPendingCandidate(null);
      setActiveCandidate(candidate);
    }
  }

  function handleDrawerSelect(candidate: string, grade: Grade) {
    selectGrade(candidate, grade);
    setActiveCandidate(null);
  }

  function handleDrawerClose() {
    setActiveCandidate(null);
  }

  function handleExitComplete() {
    if (pendingCandidate) {
      setActiveCandidate(pendingCandidate);
      setPendingCandidate(null);
    }
  }

  async function onSubmit(data: VoteInput) {
    if (!allGraded) return;

    const result = await submitVoteAction(pollId, data);
    if (!result.success) {
      if ("code" in result && result.code === "unauthenticated") {
        setAuthExpired(true);
        showDredd({ message: result.error, variant: "error" });
        return;
      }
      if ("error" in result) {
        showDredd({ message: result.error, variant: "error" });
      }
      return;
    }

    onVoted();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-8 w-full">
      <div>
        <h1 className="text-2xl font-heading font-bold uppercase tracking-wider mb-1 crt-flicker">{question}</h1>
        <p className="text-muted text-sm">
          Prononcez votre verdict pour chaque suspect
        </p>
      </div>

      {/* Desktop: inline grade buttons */}
      <div className="hidden sm:flex flex-col gap-6">
        {candidates.map((candidate) => (
          <CandidateGradeRow
            key={candidate}
            candidate={candidate}
            control={control}
            onSelectGrade={selectGrade}
          />
        ))}
      </div>

      {/* Mobile: suspect list + bottom drawer */}
      <div className="flex flex-col sm:hidden">
        {candidates.map((candidate) => (
          <MobileSuspectRow
            key={candidate}
            candidate={candidate}
            control={control}
            onTap={handleSuspectTap}
          />
        ))}
      </div>

      <AnimatedGradeDrawer
        activeCandidate={activeCandidate}
        currentGrade={activeCandidate ? grades[activeCandidate] : undefined}
        onSelect={handleDrawerSelect}
        onClose={handleDrawerClose}
        onExitComplete={handleExitComplete}
      />

      {authExpired ? (
        <Button href={`/login?callbackUrl=/poll/${pollId}`} size="lg">
          Se reconnecter
        </Button>
      ) : (
        <Button type="submit" size="lg" disabled={!allGraded || isSubmitting}>
          {isSubmitting ? "Transmission en cours..." : "Transmettre le verdict"}
        </Button>
      )}
    </form>
  );
}
