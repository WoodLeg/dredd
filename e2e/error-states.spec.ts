import { test, expect } from "@playwright/test";
import { seedPoll, voteForAllCandidates } from "./helpers";

test.describe("Error states", () => {
  test("unauthenticated user is redirected to login", async ({
    browser,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Auth redirect test?",
      candidates: ["Alpha", "Beta"],
    });

    // Create a fresh context with explicitly empty auth state
    const context = await browser.newContext({
      storageState: { cookies: [], origins: [] },
    });
    const page = await context.newPage();

    await page.goto(`http://localhost:3999/poll/${pollId}`);
    await page.waitForURL(/\/login/, { timeout: 10000 });

    expect(page.url()).toContain("/login");
    expect(page.url()).toContain(`callbackUrl`);

    await context.close();
  });

  test("404 — poll not found", async ({ page }) => {
    await page.goto("/poll/nonexistent-id-12345");

    await expect(
      page.getByRole("heading", { name: "Secteur non répertorié" })
    ).toBeVisible();

    const homeLink = page.getByRole("link", { name: "Retour au Tribunal" });
    await expect(homeLink).toBeVisible();
    await expect(homeLink).toHaveAttribute("href", "/");
  });

  test("unauthorized admin — non-owner sees access denied", async ({
    page,
    request,
  }) => {
    // Seed a poll with a different owner (not the test user)
    const { pollId } = await seedPoll(request, {
      question: "Admin access test?",
      candidates: ["Alpha", "Beta"],
      ownerId: "some-other-user-id",
    });

    await page.goto(`/poll/${pollId}/admin`);

    await expect(
      page.getByRole("heading", { name: "Accès non autorisé" })
    ).toBeVisible();

    const voteLink = page.getByRole("link", {
      name: "Retour à l'audience",
    });
    await expect(voteLink).toBeVisible();
    await expect(voteLink).toHaveAttribute("href", `/poll/${pollId}`);
  });

  test("closed poll vote page", async ({ page, request }) => {
    const { pollId } = await seedPoll(request, {
      question: "Closed poll test?",
      candidates: ["Alpha", "Beta"],
      votes: 1,
      close: true,
    });

    await page.goto(`/poll/${pollId}`);

    await expect(
      page.getByText("Audience terminée. La Loi a statué.")
    ).toBeVisible();

    const resultsLink = page.getByRole("link", {
      name: "Accéder au verdict",
    });
    await expect(resultsLink).toBeVisible();
  });

  test("duplicate vote by same user shows error", async ({
    page,
    request,
  }) => {
    const candidates = ["Option A", "Option B"];
    const { pollId } = await seedPoll(request, {
      question: "Duplicate vote test?",
      candidates,
      votes: 0,
    });

    // First vote
    await page.goto(`/poll/${pollId}`);
    await voteForAllCandidates(page, candidates);
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();

    // Verify confirmation
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();

    // Reload the page — server should detect already-voted
    await page.reload();

    // Should see already-voted message (server-side dedup)
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();
  });

  test("vote at capacity (500 votes) shows error", async ({
    page,
    request,
  }) => {
    const candidates = ["Option A", "Option B"];
    const { pollId } = await seedPoll(request, {
      question: "Capacity test?",
      candidates,
      votes: 500,
    });

    await page.goto(`/poll/${pollId}`);

    // Select a grade for each candidate
    await voteForAllCandidates(page, candidates);

    // Submit the vote
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();

    // Verify the error appears with the capacity message
    await expect(
      page.getByText(
        "Nombre maximal de dépositions atteint pour ce dossier"
      )
    ).toBeVisible({ timeout: 5000 });
  });
});
