import { test, expect } from "@playwright/test";

test.describe("Poll creation", () => {
  test("happy path — creates a poll and redirects to admin page", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // Fill the question
    await page
      .getByPlaceholder("Quel suspect mérite l'acquittement ?")
      .fill("Ma question test");

    // Fill the two default candidate inputs
    await page.getByPlaceholder("Suspect 1").fill("Candidat A");
    await page.getByPlaceholder("Suspect 2").fill("Candidat B");

    // Submit
    await page.getByRole("button", { name: "Ouvrir l'audience" }).click();

    // Verify redirect to admin page
    await expect(page.getByText("Poste de commandement")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Ma question test" })
    ).toBeVisible();

    // Share link is visible on admin page
    await expect(page.getByText("Transmission inter-secteurs")).toBeVisible();
  });

  test("add and remove candidates", async ({ page }) => {
    await page.goto("/dashboard");

    // Initially there are 2 candidate inputs
    const addButton = page.getByRole("button", {
      name: "+ Ajouter un suspect",
    });

    // Add 2 more candidates (now 4 total)
    await addButton.click();
    await addButton.click();

    // Verify 4 candidate inputs are present
    await expect(page.getByPlaceholder("Suspect 1")).toBeVisible();
    await expect(page.getByPlaceholder("Suspect 2")).toBeVisible();
    await expect(page.getByPlaceholder("Suspect 3")).toBeVisible();
    await expect(page.getByPlaceholder("Suspect 4")).toBeVisible();

    // Remove one candidate by clicking a remove button (the x buttons)
    const removeButtons = page.locator("button", { hasText: "\u00d7" });
    await removeButtons.first().click();

    // Verify 3 candidate inputs remain
    const candidateInputs = page.locator('input[name^="candidates."]');
    await expect(candidateInputs).toHaveCount(3);
  });

  test("validation — empty question prevents submission", async ({
    page,
  }) => {
    await page.goto("/dashboard");

    // The question input starts empty, so just fill the candidates
    await page.getByPlaceholder("Suspect 1").fill("Candidat A");
    await page.getByPlaceholder("Suspect 2").fill("Candidat B");

    // Submit with empty question
    await page.getByRole("button", { name: "Ouvrir l'audience" }).click();

    // The admin page heading should not appear
    await expect(
      page.getByText("Poste de commandement")
    ).not.toBeVisible();

    // An error message for the question field should be shown
    await expect(
      page.getByText("Objet du litige requis, citoyen")
    ).toBeVisible();
  });

  test("validation — duplicate candidates shows error", async ({ page }) => {
    await page.goto("/dashboard");

    // Fill the question (form is auto-shown on empty dashboard)
    await page
      .getByPlaceholder("Quel suspect mérite l'acquittement ?")
      .fill("Ma question test");

    // Fill both candidates with the same value
    await page.getByPlaceholder("Suspect 1").fill("Pizza");
    await page.getByPlaceholder("Suspect 2").fill("Pizza");

    // Submit
    await page.getByRole("button", { name: "Ouvrir l'audience" }).click();

    // The admin page heading should not appear
    await expect(
      page.getByText("Poste de commandement")
    ).not.toBeVisible();

    // The duplicate validation error should be shown
    await expect(
      page.getByText("Doublon détecté — chaque suspect doit être unique")
    ).toBeVisible();
  });
});
