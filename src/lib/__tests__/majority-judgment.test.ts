import { describe, it, expect } from "vitest";
import { computeResults } from "../majority-judgment";
import type { Vote, Grade } from "../types";

function vote(grades: Record<string, Grade>): Vote {
  return { voterId: `voter-${Math.random()}`, voterDisplayName: "Test Voter", grades };
}

describe("computeResults", () => {
  it("handles zero votes (all candidates get worst grade)", () => {
    const results = computeResults("p1", "Q?", ["Alice", "Bob"], []);
    expect(results.totalVotes).toBe(0);
    expect(results.ranking).toHaveLength(2);
    for (const r of results.ranking) {
      expect(r.medianGrade).toBe("a-rejeter");
    }
  });

  it("handles single voter", () => {
    const votes = [vote({ Alice: "excellent", Bob: "passable" })];
    const results = computeResults("p1", "Q?", ["Alice", "Bob"], votes);
    expect(results.totalVotes).toBe(1);
    expect(results.ranking[0].name).toBe("Alice");
    expect(results.ranking[0].medianGrade).toBe("excellent");
    expect(results.ranking[1].name).toBe("Bob");
    expect(results.ranking[1].medianGrade).toBe("passable");
  });

  it("computes correct median with even number of voters (lower-median)", () => {
    // 4 voters: sorted grades for Alice = [0, 1, 2, 3] → median at floor(4/2)=2 → index 2 = "bien"
    const votes = [
      vote({ Alice: "excellent" }),
      vote({ Alice: "tres-bien" }),
      vote({ Alice: "bien" }),
      vote({ Alice: "assez-bien" }),
    ];
    const results = computeResults("p1", "Q?", ["Alice"], votes);
    expect(results.ranking[0].medianGrade).toBe("bien");
  });

  it("ranks candidates correctly with clear ordering", () => {
    const votes = [
      vote({ Alice: "excellent", Bob: "bien", Charlie: "insuffisant" }),
      vote({ Alice: "excellent", Bob: "bien", Charlie: "insuffisant" }),
      vote({ Alice: "tres-bien", Bob: "assez-bien", Charlie: "a-rejeter" }),
    ];
    const results = computeResults(
      "p1",
      "Q?",
      ["Alice", "Bob", "Charlie"],
      votes
    );
    expect(results.ranking[0].name).toBe("Alice");
    expect(results.ranking[0].rank).toBe(1);
    expect(results.ranking[1].name).toBe("Bob");
    expect(results.ranking[1].rank).toBe(2);
    expect(results.ranking[2].name).toBe("Charlie");
    expect(results.ranking[2].rank).toBe(3);
  });

  it("all candidates tied share rank 1", () => {
    const votes = [
      vote({ Alice: "bien", Bob: "bien" }),
      vote({ Alice: "bien", Bob: "bien" }),
    ];
    const results = computeResults("p1", "Q?", ["Alice", "Bob"], votes);
    expect(results.ranking[0].rank).toBe(1);
    expect(results.ranking[1].rank).toBe(1);
  });

  it("partial ties produce correct ranks (1, 1, 3 not 1, 1, 2)", () => {
    const votes = [
      vote({ Alice: "excellent", Bob: "excellent", Charlie: "passable" }),
      vote({ Alice: "excellent", Bob: "excellent", Charlie: "passable" }),
    ];
    const results = computeResults(
      "p1",
      "Q?",
      ["Alice", "Bob", "Charlie"],
      votes
    );
    const ranks = results.ranking.map((r) => r.rank);
    expect(ranks).toEqual([1, 1, 3]);
  });

  it("handles single candidate", () => {
    const votes = [vote({ Alice: "tres-bien" })];
    const results = computeResults("p1", "Q?", ["Alice"], votes);
    expect(results.ranking).toHaveLength(1);
    expect(results.ranking[0].rank).toBe(1);
    expect(results.ranking[0].medianGrade).toBe("tres-bien");
  });

  it("computes correct grade distribution", () => {
    const votes = [
      vote({ Alice: "excellent" }),
      vote({ Alice: "excellent" }),
      vote({ Alice: "bien" }),
    ];
    const results = computeResults("p1", "Q?", ["Alice"], votes);
    const dist = results.ranking[0].gradeDistribution;
    expect(dist["excellent"]).toBe(2);
    expect(dist["bien"]).toBe(1);
    expect(dist["tres-bien"]).toBe(0);
    expect(dist["a-rejeter"]).toBe(0);
  });

  it("returns correct metadata", () => {
    const votes = [vote({ Alice: "bien" })];
    const results = computeResults("poll-1", "Best food?", ["Alice"], votes);
    expect(results.pollId).toBe("poll-1");
    expect(results.question).toBe("Best food?");
    expect(results.totalVotes).toBe(1);
  });
});
