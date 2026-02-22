import type { Grade } from "@/lib/types";
import { GRADE_MAP } from "@/lib/grades";

interface GradeBadgeProps {
  grade: Grade;
}

export function GradeBadge({ grade }: GradeBadgeProps) {
  const info = GRADE_MAP[grade];

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium text-sm px-3 py-1 ${info.index <= 3 ? "text-[#08080c]" : "text-white"}`}
      style={{ backgroundColor: info.color, boxShadow: `0 0 12px ${info.color}66` }}
    >
      {info.label}
    </span>
  );
}
