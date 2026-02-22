import { test as setup } from "@playwright/test";

setup("authenticate test user", async ({ page, request }) => {
  // Sign up test user via Better Auth credentials endpoint
  await request.post("http://localhost:3999/api/auth/sign-up/email", {
    data: {
      name: "Juge Test",
      email: "juge@dredd.test",
      password: "mega-city-one-2026",
    },
  });

  // Sign in to get session cookie
  await page.goto("http://localhost:3999/login");
  await page.fill('[name="email"]', "juge@dredd.test");
  await page.fill('[name="password"]', "mega-city-one-2026");
  await page.click('button[type="submit"]');

  // Wait for redirect after login
  await page.waitForURL("http://localhost:3999/dashboard");

  // Save session state
  await page.context().storageState({ path: "e2e/.auth/user.json" });
});
