import { test, expect } from "@playwright/test";
import { seedPoll, selectGradeForCandidate } from "./helpers";

test.describe("Voting flow", () => {
  test("happy path: vote on an open poll", async ({ page, request }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur langage ?",
      candidates: ["TypeScript", "Rust"],
      votes: 0,
    });

    await page.goto(`/poll/${pollId}`);

    // Select a grade for each candidate (no voter name needed — auth provides identity)
    await selectGradeForCandidate(page, "TypeScript", "Exemplaire");
    await selectGradeForCandidate(page, "Rust", "Honorable");

    // Submit the vote
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();

    // Verify confirmation message
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();
  });

  test("submit button is disabled until all candidates are graded", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur framework ?",
      candidates: ["Nuxt", "Remix"],
      votes: 0,
    });

    await page.goto(`/poll/${pollId}`);

    // Grade only the first candidate
    await selectGradeForCandidate(page, "Nuxt", "Acceptable");

    // The submit button should be disabled (not all candidates graded)
    await expect(
      page.getByRole("button", { name: "Transmettre le verdict" })
    ).toBeDisabled();

    // Grade the second candidate
    await selectGradeForCandidate(page, "Remix", "Tolérable");

    // Now the submit button should be enabled
    await expect(
      page.getByRole("button", { name: "Transmettre le verdict" })
    ).toBeEnabled();
  });

  test("already voted is detected server-side on reload", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleure ville ?",
      candidates: ["Paris", "Lyon"],
      votes: 0,
    });

    await page.goto(`/poll/${pollId}`);

    // Vote
    await selectGradeForCandidate(page, "Paris", "Exemplaire");
    await selectGradeForCandidate(page, "Lyon", "Suspect");
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();

    // Verify confirmation
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();

    // Reload the page
    await page.reload();

    // Server detects already-voted state (no localStorage needed)
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();
  });

  test("already voted + poll closed shows results link", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur dessert ?",
      candidates: ["Tiramisu", "Fondant"],
      votes: 0,
    });

    // Vote
    await page.goto(`/poll/${pollId}`);
    await selectGradeForCandidate(page, "Tiramisu", "Honorable");
    await selectGradeForCandidate(page, "Fondant", "Coupable");
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();

    // Navigate to the admin page (test user is the poll owner) and close the poll
    await page.goto(`/poll/${pollId}/admin`);
    await page
      .getByRole("button", { name: "Clôturer l'audience" })
      .click();
    await page
      .getByRole("button", { name: "Confirmer la sentence finale" })
      .click();

    // Wait for the poll to be marked as closed
    await expect(
      page.getByRole("link", { name: "Accéder au verdict" })
    ).toBeVisible();

    // Navigate back to the vote page
    await page.goto(`/poll/${pollId}`);

    // Should show the "already voted" state with a link to results since poll is closed
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Accéder au verdict" })
    ).toBeVisible();
  });
});
