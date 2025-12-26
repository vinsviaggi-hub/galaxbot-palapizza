// app/api/orders/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PizzaOrderPayload = {
  nome?: string;
  telefono?: string;
  tipo?: "TAVOLO" | "ASPORTO" | "CONSEGNA" | string;
  data?: string; // YYYY-MM-DD
  ora?: string; // HH:mm
  allergeni?: string;
  ordine?: string;
  indirizzo?: string;
  note?: string;
  canale?: string; // "APP" | "BOT" | "MANUALE" ...
  honeypot?: string;

  // compat vecchio (se ti rimane qualche form arrosticini)
  box50?: number;
  box100?: number;
  box200?: number;
  totPezzi?: number;
};

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

function toInt(n: any) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

function buildOrdineFromBoxes(body: PizzaOrderPayload) {
  const box50 = toInt(body.box50);
  const box100 = toInt(body.box100);
  const box200 = toInt(body.box200);
  const tot = toInt(body.totPezzi) || box50 * 50 + box100 * 100 + box200 * 200;
  if (tot <= 0) return "";
  const parts: string[] = [];
  if (box50) parts.push(`Box 50 x${box50}`);
  if (box100) parts.push(`Box 100 x${box100}`);
  if (box200) parts.push(`Box 200 x${box200}`);
  parts.push(`Tot pezzi: ${tot}`);
  return parts.join(" • ");
}

export async function POST(req: NextRequest) {
  try {
    const ORDERS_WEBAPP_URL = process.env.ORDERS_WEBAPP_URL;

    // ✅ USIAMO UN SOLO SECRET (quello che hai già su Vercel)
    // Deve essere lo stesso valore di "SHARED_SECRET" nelle Script Properties di Apps Script.
    const ORDERS_SHARED_SECRET = process.env.GOOGLE_SCRIPT_SECRET || "";

    if (!ORDERS_WEBAPP_URL) {
      return NextResponse.json(
        { ok: false, error: "ORDERS_WEBAPP_URL mancante (mettilo in .env.local e su Vercel)." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as PizzaOrderPayload | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: "Body JSON mancante." }, { status: 400 });
    }

    // anti-spam
    if (typeof body.honeypot === "string" && body.honeypot.trim().length > 0) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const nome = String(body.nome || "").trim();
    const telefono = String(body.telefono || "").trim();
    const tipo = String(body.tipo || "").trim().toUpperCase();
    const data = String(body.data || "").trim();
    const ora = String(body.ora || "").trim();
    const allergeni = String(body.allergeni || "").trim();
    const indirizzo = String(body.indirizzo || "").trim();
    const note = String(body.note || "").trim();
    const canale = String(body.canale || "APP").trim().toUpperCase();

    // ordine: se non c’è, prova a crearlo dai box (compat vecchio)
    const ordine = String(body.ordine || "").trim() || buildOrdineFromBoxes(body);

    if (!nome || !telefono || !tipo || !data || !ora || !ordine) {
      return NextResponse.json(
        { ok: false, error: "Campi obbligatori mancanti (nome, telefono, tipo, data, ora, ordine)." },
        { status: 400 }
      );
    }
    if (!["TAVOLO", "ASPORTO", "CONSEGNA"].includes(tipo)) {
      return NextResponse.json(
        { ok: false, error: "Tipo non valido. Usa: TAVOLO / ASPORTO / CONSEGNA." },
        { status: 400 }
      );
    }
    if (!isValidDate(data)) {
      return NextResponse.json({ ok: false, error: "Formato data non valido (YYYY-MM-DD)." }, { status: 400 });
    }
    if (!isValidTime(ora)) {
      return NextResponse.json({ ok: false, error: "Formato ora non valido (HH:mm)." }, { status: 400 });
    }
    if (tipo === "CONSEGNA" && !indirizzo) {
      return NextResponse.json({ ok: false, error: "Per CONSEGNA serve l'indirizzo." }, { status: 400 });
    }

    // ✅ payload coerente con Apps Script (sheet Ordini)
    const forward = {
      ...(ORDERS_SHARED_SECRET ? { secret: ORDERS_SHARED_SECRET } : {}),
      nome,
      telefono,
      tipo,
      data,
      ora,
      allergeni,
      ordine,
      indirizzo,
      stato: "NUOVO",
      canale,
      note,
    };

    const res = await fetch(ORDERS_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(forward),
      cache: "no-store",
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return NextResponse.json(
        { ok: false, error: `Errore pannello: ${res.status} ${res.statusText}`, details: text },
        { status: 502 }
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {}

    return NextResponse.json({ ok: true, message: "Ricevuto ✅", response: parsed ?? text });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: "Errore server /api/orders", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}