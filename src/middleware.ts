import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/", "/login", "/le-code"]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_PATHS.has(pathname)) return true;
  // /poll/* routes are exempt — each page handles its own auth:
  //   /poll/[id]         → auth required (redirects to login)
  //   /poll/[id]/admin   → auth + owner check
  //   /poll/[id]/results → intentionally public
  if (pathname.startsWith("/poll/")) return true;
  // API routes have their own guards
  if (pathname.startsWith("/api/")) return true;
  return false;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname, search } = request.nextUrl;

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Server actions use POST and validate sessions independently via getRequiredSession()
  if (request.method === "POST") {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (!session) {
    const callbackUrl = encodeURIComponent(pathname + search);
    const loginUrl = new URL(`/login?callbackUrl=${callbackUrl}`, request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|mp3|woff2?|css|js)$).*)",
  ],
};
