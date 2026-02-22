import { test, expect } from "@playwright/test";
import { seedPoll, skipCeremony } from "./helpers";

test.describe("Bulk rendering — results with many votes", () => {
  test("50 votes — renders all candidate cards with grade bars", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "50 voters test",
      candidates: ["Alpha", "Beta", "Gamma"],
      votes: 50,
      close: true,
    });

    await page.goto(`/poll/${pollId}/results`);
    await skipCeremony(page);

    // Deposition count is displayed
    await expect(page.getByText("50 dépositions")).toBeVisible();

    // All 3 candidate cards are visible
    await expect(page.getByText("Alpha")).toBeVisible();
    await expect(page.getByText("Beta")).toBeVisible();
    await expect(page.getByText("Gamma")).toBeVisible();

    // Each card has grade bars rendered inside the chart container
    const bars = page.locator("[data-bar]");
    await expect(bars.first()).toBeAttached();
    // With 3 candidates and random grades, we expect multiple bars
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(3);
  });

  test("200 votes — renders 5 candidates with percentage-based grade bars", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "200 voters test",
      candidates: ["A", "B", "C", "D", "E"],
      votes: 200,
      close: true,
    });

    await page.goto(`/poll/${pollId}/results`);
    await skipCeremony(page);

    // Deposition count is displayed
    await expect(page.getByText("200 dépositions")).toBeVisible();

    // All 5 candidate cards are visible
    for (const name of ["A", "B", "C", "D", "E"]) {
      await expect(page.getByText(name, { exact: true })).toBeVisible();
    }

    // Grade bars have data-target attributes with percentage values
    const bars = page.locator("[data-bar]");
    await expect(bars.first()).toBeAttached();
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(5);

    // Verify at least some bars have non-zero percentage targets
    const targets = await Promise.all(
      Array.from({ length: barCount }, (_, i) =>
        bars.nth(i).getAttribute("data-target")
      )
    );
    for (const target of targets) {
      expect(target).not.toBeNull();
      expect(target).toMatch(/^\d+(\.\d+)?%$/);
    }
    expect(targets.some((t) => t !== null && parseFloat(t) > 0)).toBe(true);
  });

  test("500 votes (max capacity) — renders without errors and shows winner", async ({
    page,
    request,
  }) => {
    const { pollId } = await seedPoll(request, {
      question: "Max capacity test",
      candidates: ["X", "Y", "Z"],
      votes: 500,
      close: true,
    });

    await page.goto(`/poll/${pollId}/results`);
    await skipCeremony(page);

    // Deposition count is displayed
    await expect(page.getByText("500 dépositions")).toBeVisible();

    // All 3 candidate cards are visible
    await expect(page.getByText("X", { exact: true })).toBeVisible();
    await expect(page.getByText("Y", { exact: true })).toBeVisible();
    await expect(page.getByText("Z", { exact: true })).toBeVisible();

    // Page renders without errors — grade bars are present
    const bars = page.locator("[data-bar]");
    await expect(bars.first()).toBeAttached();
    const barCount = await bars.count();
    expect(barCount).toBeGreaterThanOrEqual(3);

    // Winner card has trophy emoji
    await expect(page.getByText("\u{1F3C6}")).toBeVisible();
  });
});
