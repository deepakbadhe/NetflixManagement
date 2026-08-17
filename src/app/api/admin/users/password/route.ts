import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getUserById, setUserPassword } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const s = await getSession();
  if (!s || s.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: number; password?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const id = Number(body.id);
  const password = String(body.password || "");
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (password.length < 6) {
    return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 });
  }

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });

  await setUserPassword(id, password);
  return NextResponse.json({ ok: true });
}
