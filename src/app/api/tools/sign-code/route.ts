import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { fetchSignInCode } from "@/lib/imap";

export const runtime = "nodejs";
export const maxDuration = 30;

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* ignore */
  }

  // Per-user email lock: normal users may ONLY search their own account email.
  // Only admins may pass an arbitrary email.
  let target = user.email;
  if (user.role === "admin") {
    const requested = String(body.email || "").trim().toLowerCase();
    if (requested) {
      if (!EMAIL_RE.test(requested)) {
        return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
      }
      target = requested;
    }
  }

  try {
    const code = await fetchSignInCode(target);
    return NextResponse.json({ ok: true, found: !!code, email: target, code: code || null });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Could not reach the mailbox.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
