import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { countAdmins, deleteUser, getUserById } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  // Live DB check: a deleted/demoted admin must not be able to act on a stale cookie.
  const me = await getCurrentUser();
  if (!me || me.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: { id?: number } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  const id = Number(body.id);
  if (!id) return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  if (id === me.id) return NextResponse.json({ error: "You can't delete your own account." }, { status: 400 });

  const target = await getUserById(id);
  if (!target) return NextResponse.json({ error: "User not found." }, { status: 404 });
  if (target.role === "admin" && (await countAdmins()) <= 1) {
    return NextResponse.json({ error: "Can't delete the last admin." }, { status: 400 });
  }

  await deleteUser(id);
  return NextResponse.json({ ok: true });
}
