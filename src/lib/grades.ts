import type { Grade } from "./types";

export interface GradeInfo {
  key: Grade;
  label: string;
  color: string;
  index: number;
}

export const GRADES: GradeInfo[] = [
  { key: "excellent", label: "Exemplaire", color: "#00f0ff", index: 0 },
  { key: "tres-bien", label: "Honorable", color: "#2ee89e", index: 1 },
  { key: "bien", label: "Acceptable", color: "#a8e040", index: 2 },
  { key: "assez-bien", label: "Tolérable", color: "#f0c030", index: 3 },
  { key: "passable", label: "Suspect", color: "#f06828", index: 4 },
  { key: "insuffisant", label: "Coupable", color: "#e82850", index: 5 },
  { key: "a-rejeter", label: "Condamné", color: "#ff2d7b", index: 6 },
];

export const GRADE_MAP: Record<Grade, GradeInfo> = Object.fromEntries(
  GRADES.map((g) => [g.key, g])
) as Record<Grade, GradeInfo>;

export function gradeIndex(grade: Grade): number {
  return GRADE_MAP[grade].index;
}
