import { describe, it, expect } from "vitest";
import { createPollSchema, voteSchema } from "../schemas";

describe("createPollSchema", () => {
  const validInput = {
    question: "Où manger ce soir ?",
    candidates: [{ value: "Pizza" }, { value: "Sushi" }],
  };

  it("accepts valid input", () => {
    const result = createPollSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("trims whitespace from question and candidates", () => {
    const result = createPollSchema.safeParse({
      question: "  Test question  ",
      candidates: [{ value: "  Option A  " }, { value: "  Option B  " }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.question).toBe("Test question");
      expect(result.data.candidates[0].value).toBe("Option A");
    }
  });

  it("rejects empty question", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      question: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects question longer than 200 characters", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      question: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects fewer than 2 candidates", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      candidates: [{ value: "Only one" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects more than 20 candidates", () => {
    const candidates = Array.from({ length: 21 }, (_, i) => ({
      value: `Option ${i}`,
    }));
    const result = createPollSchema.safeParse({
      ...validInput,
      candidates,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty candidate value", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      candidates: [{ value: "Valid" }, { value: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects candidate longer than 80 characters", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      candidates: [{ value: "Valid" }, { value: "a".repeat(81) }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate candidates (case-insensitive)", () => {
    const result = createPollSchema.safeParse({
      ...validInput,
      candidates: [{ value: "Pizza" }, { value: "pizza" }],
    });
    expect(result.success).toBe(false);
  });
});

describe("voteSchema", () => {
  const validInput = {
    grades: { Pizza: "excellent", Sushi: "bien" },
  };

  it("accepts valid input", () => {
    const result = voteSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it("rejects invalid grade value", () => {
    const result = voteSchema.safeParse({
      grades: { Pizza: "invalid-grade" },
    });
    expect(result.success).toBe(false);
  });

  it("accepts empty grades record", () => {
    const result = voteSchema.safeParse({ grades: {} });
    expect(result.success).toBe(true);
  });
});
