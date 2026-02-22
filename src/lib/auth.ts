import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

function resolveBaseURL(): string {
  if (process.env.BETTER_AUTH_URL) return process.env.BETTER_AUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3999";
}

export const auth = betterAuth({
  baseURL: resolveBaseURL(),

  trustedOrigins: [
    "http://localhost:3999",
    ...(process.env.VERCEL_URL ? [`https://${process.env.VERCEL_URL}`] : []),
    ...(process.env.NEXT_PUBLIC_APP_URL ? [process.env.NEXT_PUBLIC_APP_URL] : []),
  ],

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

  // Credentials login for E2E testing and preview deployments
  emailAndPassword: {
    enabled:
      process.env.ENABLE_TEST_AUTH === "true",
  },

  plugins: [nextCookies()], // Must be last
});

export type Session = typeof auth.$Infer.Session;
