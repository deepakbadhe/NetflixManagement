import { cookies } from "next/headers";
import { COOKIE, verifySession, type Session } from "./session";
import { getUserById, type UserRow } from "./db";

// Reads and verifies the signed session cookie (server components + route handlers).
export async function getSession(): Promise<Session | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  return verifySession(token);
}

// Loads the live user row from the DB — the source of truth for email + role.
// Returns null if the session is invalid or the user no longer exists.
export async function getCurrentUser(): Promise<UserRow | null> {
  const session = await getSession();
  if (!session) return null;
  return getUserById(session.uid);
}
