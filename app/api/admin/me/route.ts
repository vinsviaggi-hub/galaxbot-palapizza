import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";

export async function GET() {
  const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";
  if (!ADMIN_SESSION_SECRET) return NextResponse.json({ authenticated: false });

  const cookieStore = await cookies();
  const token = cookieStore.get(getCookieName())?.value;

  const ok = verifySessionToken(token, ADMIN_SESSION_SECRET);
  return NextResponse.json({ authenticated: ok });
}

export const dynamic = "force-dynamic";