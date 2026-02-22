import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,

  session: {
    expiresIn: 60 * 60 * 24, // 24 hours
    updateAge: 60 * 60 * 4, // refresh if >4 hours old
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24,
      strategy: "jwe",
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },

  // Dev-only credentials login for E2E testing
  // Double-guard: both NODE_ENV and explicit flag must be set
  emailAndPassword: {
    enabled:
      process.env.NODE_ENV !== "production" &&
      process.env.ENABLE_TEST_AUTH === "true",
  },

  plugins: [nextCookies()], // Must be last
});

export type Session = typeof auth.$Infer.Session;
