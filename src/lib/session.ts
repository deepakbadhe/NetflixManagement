import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (no Node-only imports here so middleware can use them).

export const COOKIE = "nm_session";

export type Role = "admin" | "user";
export type Session = { uid: number; email: string; role: Role };

function getSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 8) {
    // Keeps local dev working; you MUST set a real SESSION_SECRET in production.
    return new TextEncoder().encode("insecure-dev-secret-please-set-SESSION_SECRET");
  }
  return new TextEncoder().encode(s);
}

export async function createSession(session: Session): Promise<string> {
  return await new SignJWT({ email: session.email, role: session.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(session.uid))
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    const uid = Number(payload.sub);
    const email = typeof payload.email === "string" ? payload.email : "";
    const role: Role = payload.role === "admin" ? "admin" : "user";
    if (!uid || !email) return null;
    return { uid, email, role };
  } catch {
    return null;
  }
}

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  };
}

export function clearCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 0,
  };
}
