import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

// Optimistic check only: real authorization happens in requireUser().
export function proxy(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  if (!hasSession) {
    const url = new URL("/login", request.url);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
