import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { LoginClient } from "./login-client";

function getSafeCallbackUrl(callbackUrl: string | null): string {
  if (!callbackUrl) return "/";
  try {
    const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3999";
    const url = new URL(callbackUrl, base);
    if (url.origin !== new URL(base).origin) return "/";
    return url.pathname + url.search;
  } catch {
    return "/";
  }
}

interface LoginPageProps {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await auth.api.getSession({ headers: await headers() });
  const { callbackUrl, error } = await searchParams;

  if (session) {
    redirect(getSafeCallbackUrl(callbackUrl ?? null));
  }

  const enableTestAuth =
    process.env.NODE_ENV !== "production" &&
    process.env.ENABLE_TEST_AUTH === "true";

  return (
    <LoginClient
      callbackUrl={getSafeCallbackUrl(callbackUrl ?? null)}
      enableTestAuth={enableTestAuth}
      error={error}
    />
  );
}
