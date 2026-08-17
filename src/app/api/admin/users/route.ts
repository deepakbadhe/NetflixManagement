import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { createUser, listUsers } from "@/lib/db";

export const runtime = "nodejs";

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

async function ensureAdmin() {
  const s = await getSession();
  return s && s.role === "admin" ? s : null;
}

export async function GET() {
  if (!(await ensureAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const users = await listUsers();
  return NextResponse.json({ users });
}

export async function POST(req: Request) {
  if (!(await ensureAdmin())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { email?: string; password?: string; role?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");
  const role = body.role === "admin" ? "admin" : "user";

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "A valid email is required (it becomes the username)." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  try {
    const user = await createUser(email, password, role);
    return NextResponse.json({ ok: true, user });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "A user with that email already exists." }, { status: 409 });
    }
    const message = e instanceof Error ? e.message : "Could not create user.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
