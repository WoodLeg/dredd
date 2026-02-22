import { describe, it, expect, beforeEach, vi } from "vitest";

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

// Mock store — isolate actions from Redis
const mockCreatePoll = vi.fn();
const mockGetPollMeta = vi.fn();
const mockAddVote = vi.fn();
const mockClosePoll = vi.fn();

vi.mock("../store", () => ({
  createPoll: (...args: unknown[]) => mockCreatePoll(...args),
  getPollMeta: (...args: unknown[]) => mockGetPollMeta(...args),
  addVote: (...args: unknown[]) => mockAddVote(...args),
  closePoll: (...args: unknown[]) => mockClosePoll(...args),
}));

// Import after mocks are set up
const { createPollAction, submitVoteAction, closePollAction } = await import("../actions");
const { auth } = await import("../auth");

beforeEach(() => {
  vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);
  mockCreatePoll.mockReset();
  mockGetPollMeta.mockReset();
  mockAddVote.mockReset();
  mockClosePoll.mockReset();

  // Default mock implementations
  mockCreatePoll.mockResolvedValue({ poll: {} });
  mockGetPollMeta.mockResolvedValue(undefined);
  mockAddVote.mockResolvedValue({ success: true });
  mockClosePoll.mockResolvedValue({ success: true });
});

describe("createPollAction", () => {
  const validInput = {
    question: "Ou manger ?",
    candidates: [{ value: "Pizza" }, { value: "Sushi" }],
  };

  it("creates a poll successfully", async () => {
    mockCreatePoll.mockResolvedValueOnce({ poll: { id: "abc1234567" } });

    const result = await createPollAction(validInput);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected success");
    expect(result.data.id).toBeDefined();
    expect(result.data.id.length).toBe(10);

    // Verify createPoll was called with correct shape
    expect(mockCreatePoll).toHaveBeenCalledOnce();
    const pollArg = mockCreatePoll.mock.calls[0][0];
    expect(pollArg.question).toBe("Ou manger ?");
    expect(pollArg.candidates).toEqual(["Pizza", "Sushi"]);
    expect(pollArg.ownerId).toBe("test-user-id");
    expect(pollArg.ownerDisplayName).toBe("Juge Test");
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
  const pollId = "test-poll-id";

  beforeEach(() => {
    mockGetPollMeta.mockResolvedValue({
      id: pollId,
      question: "Test?",
      candidates: ["Alice", "Bob"],
      ownerId: "test-user-id",
      ownerDisplayName: "Juge Test",
      createdAt: Date.now(),
      isClosed: false,
    });
  });

  it("submits a vote successfully", async () => {
    mockAddVote.mockResolvedValueOnce({ success: true });
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien" },
    });
    expect(result.success).toBe(true);
    expect(mockAddVote).toHaveBeenCalledOnce();
  });

  it("returns error for non-existent poll", async () => {
    mockGetPollMeta.mockResolvedValueOnce(undefined);
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
    mockAddVote.mockResolvedValueOnce({
      success: false,
      code: "duplicate_vote",
      error: "Déposition déjà enregistrée sous ce matricule",
    });
    const result = await submitVoteAction(pollId, {
      grades: { Alice: "excellent", Bob: "bien" },
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
  const pollId = "test-poll-id";

  it("closes a poll successfully", async () => {
    mockClosePoll.mockResolvedValueOnce({ success: true });
    const result = await closePollAction({ pollId });
    expect(result.success).toBe(true);
    expect(mockClosePoll).toHaveBeenCalledWith(pollId, "test-user-id");
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
    mockClosePoll.mockResolvedValueOnce({
      success: false,
      code: "forbidden",
      error: "Identification Juge en Chef invalide",
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
