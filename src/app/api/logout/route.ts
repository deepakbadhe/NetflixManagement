import { NextResponse } from "next/server";
import { COOKIE, clearCookieOptions } from "@/lib/session";

export const runtime = "nodejs";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE, "", clearCookieOptions());
  return res;
}
