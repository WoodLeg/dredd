import { expect, type APIRequestContext, type Page } from "@playwright/test";

export interface SeedOptions {
  question: string;
  candidates: string[];
  votes?: number;
  close?: boolean;
  ownerId?: string;
}

export interface SeedResponse {
  pollId: string;
  ownerId: string;
  votesCreated: number;
}

export async function seedPoll(
  request: APIRequestContext,
  options: SeedOptions
): Promise<SeedResponse> {
  const response = await request.post("/api/test/seed", { data: options });
  expect(response.ok()).toBe(true);
  return response.json();
}

/**
 * Selects a grade for a specific candidate by finding the candidate's section
 * (the container with the candidate name), then clicking the grade button within it.
 */
export async function selectGradeForCandidate(
  page: Page,
  candidate: string,
  grade: string
): Promise<void> {
  const section = page
    .locator(".flex.flex-col.gap-2")
    .filter({ hasText: candidate });
  await section.getByRole("button", { name: grade, exact: true }).click();
}

/**
 * Selects "Suspect" for every candidate — useful for tests that just need
 * all candidates graded to enable the submit button.
 */
export async function voteForAllCandidates(
  page: Page,
  candidates: string[]
): Promise<void> {
  for (const candidate of candidates) {
    await selectGradeForCandidate(page, candidate, "Suspect");
  }
}

/**
 * Skip the results ceremony by clicking the skip button if it appears.
 * The ceremony plays on first visit to a results page (DELIBERATING → VERDICT → FULL_RESULTS).
 * This helper clicks through the skip buttons to go straight to full results.
 */
export async function skipCeremony(page: Page): Promise<void> {
  const skipDeliberation = page.getByText("Passer au verdict");
  const skipVerdict = page.getByText("Voir le détail complet");

  // Phase 1: skip deliberation if visible
  if (await skipDeliberation.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipDeliberation.click();
  }

  // Phase 2: skip verdict if visible
  if (await skipVerdict.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipVerdict.click();
  }
}

/**
 * Login as a second test user (for tests that need a different voter).
 * Creates a new browser context with separate auth state.
 */
export async function loginAsSecondUser(
  page: Page,
  request: APIRequestContext
): Promise<void> {
  await request.post("http://localhost:3999/api/auth/sign-up/email", {
    data: { name: "Juge Beta", email: "beta@dredd.test", password: "mega-city-two" },
  });
  await page.goto("http://localhost:3999/login");
  await page.fill('[name="email"]', "beta@dredd.test");
  await page.fill('[name="password"]', "mega-city-two");
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/dashboard/);
}
