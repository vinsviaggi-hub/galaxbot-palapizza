// app/api/admin/logout/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function clearAdminCookie() {
  const cookieStore = await cookies();

  cookieStore.set({
    name: getCookieName(),
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function POST() {
  await clearAdminCookie();
  return NextResponse.json({ ok: true });
}

export async function GET(req: Request) {
  await clearAdminCookie();
  return NextResponse.redirect(new URL("/pannello/login", req.url));
}