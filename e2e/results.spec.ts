import { test, expect } from "@playwright/test";
import { seedPoll, skipCeremony } from "./helpers";

test.describe("Results page — closed poll with votes", () => {
  test("displays question, deposition count, ranked candidates, trophy, and grade badges", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur film ?",
      candidates: ["Film A", "Film B", "Film C"],
      votes: 10,
      close: true,
    });

    await page.goto(`/poll/${pollId}/results`);
    await skipCeremony(page);

    // Question is displayed as h1
    await expect(
      page.getByRole("heading", { name: "Meilleur film ?" })
    ).toBeVisible();

    // Deposition count text
    await expect(page.getByText("10 dépositions")).toBeVisible();

    // All 3 candidate names are visible
    for (const candidate of ["Film A", "Film B", "Film C"]) {
      await expect(page.getByText(candidate)).toBeVisible();
    }

    // 3 candidate cards rendered
    const cards = page.locator("[data-testid='results-card']");
    await expect(cards).toHaveCount(3);

    // Winner card (first one) has a trophy emoji
    await expect(cards.first().getByText("\u{1F3C6}")).toBeVisible();

    // At least one known grade label is visible
    const anyGrade = page.getByText(
      /Exemplaire|Honorable|Acceptable|Tolérable|Suspect|Coupable|Condamné/
    );
    await expect(anyGrade.first()).toBeVisible();

    // "Ouvrir un nouveau dossier" link is visible at the bottom
    const newVoteLink = page.getByRole("link", {
      name: "Ouvrir un nouveau dossier",
    });
    await expect(newVoteLink).toBeVisible();
  });
});

test.describe("Results page — poll still open", () => {
  test("shows deliberation message with link back to vote", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur film ?",
      candidates: ["Film A", "Film B"],
      votes: 5,
    });

    await page.goto(`/poll/${pollId}/results`);

    // Heading indicates deliberation in progress
    await expect(
      page.getByRole("heading", {
        name: "Délibération en cours",
      })
    ).toBeVisible();

    // Link back to the voting page
    const backLink = page.getByRole("link", {
      name: "Retour à l'audience",
    });
    await expect(backLink).toBeVisible();
    await expect(backLink).toHaveAttribute("href", `/poll/${pollId}`);
  });
});

test.describe("Results page — zero votes", () => {
  test("renders without error when poll is closed with no votes", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Meilleur film ?",
      candidates: ["Film A", "Film B"],
      votes: 0,
      close: true,
    });

    await page.goto(`/poll/${pollId}/results`);

    // Question is still displayed
    await expect(
      page.getByRole("heading", { name: "Meilleur film ?" })
    ).toBeVisible();

    // Shows zero-deposition text
    await expect(
      page.getByText("Aucune déposition enregistrée")
    ).toBeVisible();

    // No candidate cards rendered
    const cards = page.locator("[data-testid='results-card']");
    await expect(cards).toHaveCount(0);
  });
});
