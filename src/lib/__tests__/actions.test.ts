import { describe, it, expect, beforeEach, vi } from "vitest";
import { _resetForTesting, getPoll } from "../store";

// Mock next/headers
vi.mock("next/headers", () => ({
  headers: vi.fn(() => Promise.resolve(new Headers())),
}));

// Mock auth — simulate authenticated session
const mockSession = {
  user: { id: "test-user-id", name: "Juge Test", email: "test@dredd.test" },
  session: { id: "session-id" },
};

vi.mock("../auth", () => ({
  auth: {
    api: {
      getSession: vi.fn(() => Promise.resolve(mockSession)),
    },
  },
}));

// Import after mocks are set up
const { createPollAction, submitVoteAction, closePollAction } = await import("../actions");
const { auth } = await import("../auth");

beforeEach(() => {
  _resetForTesting();
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
});

describe("createPollAction", () => {
  const validInput = {
    question: "Où manger ?",
    candidates: [{ value: "Pizza" }, { value: "Sushi" }],
  };

  it("creates a poll successfully", async () => {
    const result = await createPollAction(validInput);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected success");
    expect(result.data.id).toBeDefined();
    expect(result.data.id.length).toBe(10);
  });

  it("stores the poll with the session user as owner", async () => {
    const result = await createPollAction(validInput);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected success");
    const poll = getPoll(result.data.id);
    expect(poll).toBeDefined();
    expect(poll!.question).toBe("Où manger ?");
    expect(poll!.ownerId).toBe("test-user-id");
    expect(poll!.ownerDisplayName).toBe("Juge Test");
  });

  it("returns field errors for invalid input", async () => {
    const result = await createPollAction({
      question: "",
      candidates: [{ value: "Only one" }],
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("errors" in result).toBe(true);
  });

  it("returns unauthenticated when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const result = await createPollAction(validInput);
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("unauthenticated");
  });
});

describe("submitVoteAction", () => {
  let pollId: string;

  beforeEach(async () => {
    const result = await createPollAction({
      question: "Test?",
      candidates: [{ value: "Alice" }, { value: "Bob" }],
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Setup failed");
    pollId = result.data.id;
  });

  it("submits a vote successfully", async () => {
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien" },
    });
    expect(result.success).toBe(true);
  });

  it("returns error for non-existent poll", async () => {
    const result = await submitVoteAction("non-existent", {
      grades: { Alice: "excellent" },
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("not_found");
  });

  it("returns error when grade is missing for a candidate", async () => {
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent" },
    });
    expect(result.success).toBe(false);
  });

  it("returns error for invalid grade", async () => {
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "not-a-grade" },
    });
    expect(result.success).toBe(false);
  });

  it("returns error for extra grades (unknown candidate)", async () => {
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien", Unknown: "bien" },
    });
    expect(result.success).toBe(false);
  });

  it("returns error for duplicate voter", async () => {
    await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien" },
    });
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "bien", Bob: "excellent" },
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("duplicate_vote");
  });

  it("returns unauthenticated when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien" },
    });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("unauthenticated");
  });
});

describe("closePollAction", () => {
  let pollId: string;

  beforeEach(async () => {
    const result = await createPollAction({
      question: "Test?",
      candidates: [{ value: "Alice" }, { value: "Bob" }],
    });
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Setup failed");
    pollId = result.data.id;
  });

  it("closes a poll successfully", async () => {
    const result = await closePollAction({ pollId });
    expect(result.success).toBe(true);
    expect(getPoll(pollId)!.isClosed).toBe(true);
  });

  it("returns field errors for invalid input", async () => {
    const result = await closePollAction({ pollId: "" });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("errors" in result).toBe(true);
  });

  it("returns forbidden for non-owner", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce({
      user: { id: "other-user", name: "Other", email: "other@test.com" },
      session: { id: "s2" },
    });
    const result = await closePollAction({ pollId });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("forbidden");
  });

  it("returns unauthenticated when no session", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);
    const result = await closePollAction({ pollId });
    expect(result.success).toBe(false);
    if (result.success) throw new Error("Expected failure");
    expect("code" in result && result.code).toBe("unauthenticated");
  });
});
