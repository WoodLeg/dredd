import { test, expect } from "@playwright/test";
import { skipCeremony } from "./helpers";

test.describe("Golden path — full voting journey", () => {
  test("create poll, vote, close, and view results", async ({ page }) => {
    test.setTimeout(60_000);
    // -------------------------------------------------------
    // 1. Navigate to dashboard (poll creation hub)
    // -------------------------------------------------------
    await page.goto("/dashboard");

    // -------------------------------------------------------
    // 2. Create a poll with 3 candidates
    // -------------------------------------------------------
    await page
      .getByPlaceholder("Quel suspect mérite l'acquittement ?")
      .fill("Où mange-t-on ce soir ?");

    // Fill the two default candidate inputs
    await page.getByPlaceholder("Suspect 1").fill("Pizza");
    await page.getByPlaceholder("Suspect 2").fill("Sushi");

    // Add a third candidate
    await page
      .getByRole("button", { name: "+ Ajouter un suspect" })
      .click();
    await page.getByPlaceholder("Suspect 3").fill("Burger");

    // Submit the poll creation form
    await page.getByRole("button", { name: "Ouvrir l'audience" }).click();

    // Wait for redirect to admin page
    await expect(page.getByText("Poste de commandement")).toBeVisible();

    // -------------------------------------------------------
    // 3. Extract poll ID from the URL
    // -------------------------------------------------------
    const adminUrl = page.url();
    const pollId = adminUrl.match(/\/poll\/([^/]+)\/admin/)?.[1];
    expect(pollId).toBeTruthy();

    // -------------------------------------------------------
    // 4. Navigate to the poll URL to vote
    // -------------------------------------------------------
    await page.goto(`/poll/${pollId}`);

    // Verify the question is displayed
    await expect(
      page.getByRole("heading", { name: "Où mange-t-on ce soir ?" })
    ).toBeVisible();

    // -------------------------------------------------------
    // 5. Vote (no voter name needed — auth provides identity)
    // -------------------------------------------------------
    const candidates = ["Pizza", "Sushi", "Burger"];
    const grades = ["Exemplaire", "Honorable", "Acceptable"];

    for (let i = 0; i < candidates.length; i++) {
      const candidateSection = page
        .locator(".flex.flex-col.gap-2")
        .filter({ hasText: candidates[i] });

      await candidateSection
        .getByRole("button", { name: grades[i], exact: true })
        .click();
    }

    // Submit the vote
    await page
      .getByRole("button", { name: "Transmettre le verdict" })
      .click();

    // -------------------------------------------------------
    // 6. Verify vote confirmation
    // -------------------------------------------------------
    await expect(
      page.getByText("Verdict enregistré dans les archives judiciaires")
    ).toBeVisible();

    // -------------------------------------------------------
    // 7. Navigate to the admin page (user is the poll owner)
    // -------------------------------------------------------
    await page.goto(`/poll/${pollId}/admin`);

    // Verify admin page shows poll is open
    await expect(page.getByText("En session")).toBeVisible();

    // -------------------------------------------------------
    // 8. Close the poll
    // -------------------------------------------------------
    await page
      .getByRole("button", { name: "Clôturer l'audience" })
      .click();
    await page
      .getByRole("button", { name: "Confirmer la sentence finale" })
      .click();

    // Verify the poll is now closed
    await expect(page.getByText("Clôturé")).toBeVisible();

    // -------------------------------------------------------
    // 9. Navigate to the results page
    // -------------------------------------------------------
    await page.goto(`/poll/${pollId}/results`);
    await skipCeremony(page);

    // -------------------------------------------------------
    // 10. Verify results page content
    // -------------------------------------------------------
    // Question is displayed
    await expect(
      page.getByRole("heading", { name: "Où mange-t-on ce soir ?" })
    ).toBeVisible();

    // Deposition count is shown
    await expect(page.getByText("1 déposition")).toBeVisible();

    // All 3 candidate cards are visible
    for (const candidate of candidates) {
      await expect(page.getByText(candidate)).toBeVisible();
    }

    // Winner card has trophy emoji
    await expect(page.getByText("\u{1F3C6}")).toBeVisible();
  });
});
