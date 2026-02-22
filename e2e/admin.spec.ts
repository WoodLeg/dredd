import { test, expect } from "@playwright/test";
import { seedPoll } from "./helpers";

test.describe("Admin panel", () => {
  test("close poll — two-step confirmation", async ({ page, request }) => {
    // Seed an open poll with 2 votes (owned by test user via session)
    const { pollId } = await seedPoll(request, {
      question: "Meilleur langage ?",
      candidates: ["TypeScript", "Rust"],
      votes: 2,
    });

    // Navigate to the admin page (session-gated, no token needed)
    await page.goto(`/poll/${pollId}/admin`);

    // Verify the poll is open and shows the correct deposition count
    await expect(page.getByText("En session")).toBeVisible();
    await expect(page.getByText("2 dépositions")).toBeVisible();

    // Click the close button — first step
    await page
      .getByRole("button", { name: "Clôturer l'audience" })
      .click();

    // Verify the confirmation step appears
    await expect(
      page.getByRole("button", { name: "Confirmer la sentence finale" })
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Annuler" })
    ).toBeVisible();
    await expect(
      page.getByText("Sentence irréversible")
    ).toBeVisible();

    // Confirm the closure
    await page
      .getByRole("button", { name: "Confirmer la sentence finale" })
      .click();

    // Verify the poll is now closed
    await expect(page.getByText("Clôturé")).toBeVisible();

    // Verify the results link appears
    await expect(
      page.getByRole("link", { name: "Accéder au verdict" })
    ).toBeVisible();
  });

  test("cancel close — poll remains open", async ({ page, request }) => {
    // Seed an open poll (owned by test user via session)
    const { pollId } = await seedPoll(request, {
      question: "Meilleur framework ?",
      candidates: ["Next.js", "Remix"],
    });

    // Navigate to the admin page
    await page.goto(`/poll/${pollId}/admin`);

    // Verify the poll is open
    await expect(page.getByText("En session")).toBeVisible();

    // Click the close button — first step
    await page
      .getByRole("button", { name: "Clôturer l'audience" })
      .click();

    // Cancel the closure
    await page.getByRole("button", { name: "Annuler" }).click();

    // Verify the poll remains open
    await expect(page.getByText("En session")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Clôturer l'audience" })
    ).toBeVisible();
  });

  test("already closed state — shows closed status and results link", async ({
    page,
    request,
  }) => {
    // Seed a closed poll (owned by test user via session)
    const { pollId } = await seedPoll(request, {
      question: "Meilleur IDE ?",
      candidates: ["VS Code", "Neovim"],
      votes: 3,
      close: true,
    });

    // Navigate to the admin page
    await page.goto(`/poll/${pollId}/admin`);

    // Verify the poll shows as closed
    await expect(page.getByText("Clôturé")).toBeVisible();

    // Verify the close button is NOT visible
    await expect(
      page.getByRole("button", { name: "Clôturer l'audience" })
    ).not.toBeVisible();

    // Verify the results link is visible
    await expect(
      page.getByRole("link", { name: "Accéder au verdict" })
    ).toBeVisible();
  });
});
