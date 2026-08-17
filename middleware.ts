import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { getAuthSecretBytes } from "@/lib/auth-secret";
import { isPublicDemoModeFromEnv } from "@/lib/public-demo-flag";

/**
 * Protects app routes. JWT cookie is required unless public demo mode is enabled
 * (then `getSession()` resolves the shared demo user without a cookie).
 */
export async function middleware(request: NextRequest) {
  if (isPublicDemoModeFromEnv()) {
    return NextResponse.next();
  }

  const token = request.cookies.get("sb_session")?.value;
  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  try {
    await jwtVerify(token, getAuthSecretBytes());
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/dashboard/:path*", "/invoice/:path*", "/api/invoices/:path*"],
};
