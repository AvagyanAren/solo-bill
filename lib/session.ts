import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

import { getAuthSecretBytes } from "@/lib/auth-secret";

const SESSION_COOKIE = "sb_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 7;

export type SessionPayload = {
  userId: string;
  email: string;
};

export async function createSession(userId: string, email: string): Promise<void> {
  const secret = getAuthSecretBytes();
  const token = await new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SEC}s`)
    .sign(secret);

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  try {
    const { payload } = await jwtVerify(token, getAuthSecretBytes());
    const userId = payload.sub;
    const email = payload.email;
    if (typeof userId !== "string" || typeof email !== "string") {
      return null;
    }
    return { userId, email };
  } catch {
    return null;
  }
}

export async function clearSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}
