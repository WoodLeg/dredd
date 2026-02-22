import type { Grade, Vote, CandidateResult, PollResults } from "./types";
import { GRADES, gradeIndex } from "./grades";

/**
 * Precompute the order of original indices visited by iterative median
 * removal.  For a sorted array of length n, repeatedly taking the element
 * at floor(remaining/2) and removing it yields a deterministic sequence
 * of original indices.  Because both candidate arrays share the same
 * length we can cache and reuse this sequence.
 */
const medianOrderCache = new Map<number, number[]>();

function medianRemovalOrder(n: number): number[] {
  const cached = medianOrderCache.get(n);
  if (cached) return cached;

  const indices = Array.from({ length: n }, (_, i) => i);
  const order: number[] = new Array(n);
  for (let step = 0; step < n; step++) {
    const mid = Math.floor(indices.length / 2);
    order[step] = indices[mid];
    indices.splice(mid, 1);
  }
  medianOrderCache.set(n, order);
  return order;
}

/**
 * Compare two candidates using iterative median removal.
 * Both arrays must already be sorted ascending and have the same length.
 *
 * Uses a precomputed index sequence so that comparisons are O(n) with no
 * array copies or splices.
 */
function compareSorted(aSorted: number[], bSorted: number[]): number {
  const order = medianRemovalOrder(aSorted.length);
  for (const idx of order) {
    if (aSorted[idx] !== bSorted[idx]) return aSorted[idx] - bSorted[idx];
  }
  return 0;
}

function rankCandidates(
  candidates: string[],
  votes: Vote[]
): CandidateResult[] {
  if (votes.length === 0) {
    return candidates.map((name, i) => ({
      name,
      medianGrade: GRADES[GRADES.length - 1].key,
      gradeDistribution: Object.fromEntries(
        GRADES.map((g) => [g.key, 0])
      ) as Record<Grade, number>,
      rank: i + 1,
    }));
  }

  const results = candidates.map((name) => {
    const candidateGrades = votes.map((v) => v.grades[name]);
    const indices = candidateGrades.map(gradeIndex);

    // Pre-sort once — reused by compareSorted without re-sorting
    const sorted = [...indices].sort((a, b) => a - b);
    const medianIdx = sorted[Math.floor(sorted.length / 2)];

    const distribution = Object.fromEntries(
      GRADES.map((g) => [g.key, 0])
    ) as Record<Grade, number>;
    for (const grade of candidateGrades) {
      distribution[grade]++;
    }

    return {
      name,
      medianGrade: GRADES[medianIdx].key,
      gradeDistribution: distribution,
      sorted,
      rank: 0,
    };
  });

  // Sort using tie-breaking comparator
  results.sort((a, b) => compareSorted(a.sorted, b.sorted));

  // Assign ranks — only truly tied candidates share a rank
  for (let i = 0; i < results.length; i++) {
    if (i === 0) {
      results[i].rank = 1;
    } else {
      if (compareSorted(results[i].sorted, results[i - 1].sorted) === 0) {
        results[i].rank = results[i - 1].rank;
      } else {
        results[i].rank = i + 1;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  return results.map(({ sorted, ...rest }) => rest);
}

export function computeResults(
  pollId: string,
  question: string,
  candidates: string[],
  votes: Vote[]
): PollResults {
  return {
    pollId,
    question,
    ranking: rankCandidates(candidates, votes),
    totalVotes: votes.length,
  };
}
