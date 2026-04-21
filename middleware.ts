import { type NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { getAuthSecretBytes } from "@/lib/auth-secret";

export async function middleware(request: NextRequest) {
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
  matcher: ["/dashboard/:path*", "/invoice/:path*"],
};
