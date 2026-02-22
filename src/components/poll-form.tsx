"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useDreddFeedback } from "@/lib/dredd-feedback-context";

import { createPollSchema, type CreatePollInput } from "@/lib/schemas";
import { createPollAction } from "@/lib/actions";

export function PollForm() {
  const router = useRouter();
  const { showDredd } = useDreddFeedback();
  const [authExpired, setAuthExpired] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreatePollInput>({
    resolver: zodResolver(createPollSchema),
    defaultValues: {
      question: "",
      candidates: [{ value: "" }, { value: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "candidates",
  });

  async function onSubmit(data: CreatePollInput) {
    const result = await createPollAction(data);
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

    router.push(`/poll/${result.data.id}/admin`);
  }

  if (authExpired) {
    return (
      <div className="flex flex-col gap-4 items-center text-center">
        <p className="text-muted">Session expirée. Reconnectez-vous, citoyen.</p>
        <Button href="/login?callbackUrl=/" size="lg">
          Se reconnecter
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 w-full">
      <div>
        <label className="block text-sm text-muted mb-2">
          Objet du litige
        </label>
        <Input
          {...register("question")}
          placeholder="Quel suspect mérite l'acquittement ?"
          maxLength={200}
          error={errors.question?.message}
        />
      </div>

      <div>
        <label className="block text-sm text-muted mb-2">Suspects</label>
        <div className="flex flex-col gap-2">
          {fields.map((field, i) => (
            <div key={field.id} className="flex gap-2">
              <Input
                {...register(`candidates.${i}.value`)}
                placeholder={`Suspect ${i + 1}`}
                maxLength={80}
                error={errors.candidates?.[i]?.value?.message}
              />
              {fields.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  className="shrink-0 text-muted hover:text-grade-a-rejeter transition-colors px-2 cursor-pointer"
                >
                  &times;
                </button>
              )}
            </div>
          ))}
        </div>

        {errors.candidates?.root?.message && (
          <p className="mt-1 text-sm text-grade-a-rejeter">
            {errors.candidates.root.message}
          </p>
        )}
        {errors.candidates?.message && (
          <p className="mt-1 text-sm text-grade-a-rejeter">
            {errors.candidates.message}
          </p>
        )}

        {fields.length < 20 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => append({ value: "" })}
            className="mt-2"
          >
            + Ajouter un suspect
          </Button>
        )}
      </div>

      <Button type="submit" size="lg" disabled={isSubmitting}>
        {isSubmitting ? "Enregistrement du dossier..." : "Ouvrir l'audience"}
      </Button>
    </form>
  );
}
