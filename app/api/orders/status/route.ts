import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getCookieName, verifySessionToken } from "@/lib/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = {
  id?: string;
  stato?: string; // NUOVO | CONFERMATO | CONSEGNATO | ANNULLATO
};

const ALLOWED = new Set(["NUOVO", "CONFERMATO", "CONSEGNATO", "ANNULLATO"]);

export async function POST(req: NextRequest) {
  try {
    const GOOGLE_SCRIPT_URL = process.env.GOOGLE_SCRIPT_URL || "";
    const GOOGLE_SCRIPT_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";
    const ADMIN_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || "";

    if (!GOOGLE_SCRIPT_URL) {
      return NextResponse.json({ ok: false, error: "GOOGLE_SCRIPT_URL mancante" }, { status: 500 });
    }
    if (!ADMIN_SESSION_SECRET) {
      return NextResponse.json({ ok: false, error: "ADMIN_SESSION_SECRET mancante" }, { status: 500 });
    }

    // ✅ auth staff (cookie)
    const cookieStore = await cookies();
    const token = cookieStore.get(getCookieName())?.value;

    if (!verifySessionToken(token, ADMIN_SESSION_SECRET)) {
      return NextResponse.json({ ok: false, error: "Non autorizzato" }, { status: 401 });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const id = String(body?.id || "").trim();
    const stato = String(body?.stato || "").trim().toUpperCase();

    if (!id) {
      return NextResponse.json({ ok: false, error: "Manca id" }, { status: 400 });
    }
    if (!stato || !ALLOWED.has(stato)) {
      return NextResponse.json({ ok: false, error: "Stato non valido" }, { status: 400 });
    }

    // ✅ chiama Apps Script (updateStatus)
    const r = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "updateStatus",
        id,
        stato,
        secret: GOOGLE_SCRIPT_SECRET || undefined,
      }),
      cache: "no-store",
    });

    const text = await r.text().catch(() => "");

    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      data = null;
    }

    if (!r.ok) {
      return NextResponse.json(
        { ok: false, error: `Errore Apps Script: ${r.status} ${r.statusText}`, details: data ?? text },
        { status: 502 }
      );
    }

    if (data && data.ok === false) {
      return NextResponse.json(
        { ok: false, error: data.error || "Errore updateStatus Apps Script", details: data },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, result: data ?? text });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Errore server /api/orders/status", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}