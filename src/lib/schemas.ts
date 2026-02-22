import { z } from "zod";

const VALID_GRADES = [
  "excellent",
  "tres-bien",
  "bien",
  "assez-bien",
  "passable",
  "insuffisant",
  "a-rejeter",
] as const;

export const gradeEnum = z.enum(VALID_GRADES);

export const createPollSchema = z.object({
  question: z
    .string()
    .min(1, { error: "Objet du litige requis, citoyen" })
    .max(200, { error: "Limite de 200 caractères pour l'objet du litige" })
    .transform((v) => v.trim()),
  candidates: z
    .array(
      z.object({
        value: z
          .string()
          .min(1, { error: "Identification du suspect requise" })
          .max(80, { error: "Limite de 80 caractères par suspect" })
          .transform((v) => v.trim()),
      })
    )
    .min(2, { error: "Minimum 2 suspects requis pour ouvrir une audience" })
    .max(20, { error: "Capacité maximale : 20 suspects par audience" })
    .refine(
      (candidates) => {
        const values = candidates.map((c) => c.value.toLowerCase());
        return new Set(values).size === values.length;
      },
      { error: "Doublon détecté — chaque suspect doit être unique" }
    ),
});

export type CreatePollInput = z.infer<typeof createPollSchema>;

export const voteSchema = z.object({
  grades: z.record(z.string(), gradeEnum),
});

export type VoteInput = z.infer<typeof voteSchema>;

export const closePollSchema = z.object({
  pollId: z.string().min(1),
});

export type ClosePollInput = z.infer<typeof closePollSchema>;
