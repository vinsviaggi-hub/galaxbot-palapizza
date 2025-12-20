import { NextRequest, NextResponse } from "next/server";

type BookingPayload = {
  // IT
  nome?: string;
  telefono?: string;
  tipo?: "ASPORTO" | "CONSEGNA" | "TAVOLO";
  data?: string; // YYYY-MM-DD
  ora?: string;  // HH:mm
  ordine?: string;

  indirizzo?: string;
  persone?: string;
  pagamento?: string;
  allergeni?: string;
  note?: string;

  negozio?: string;
  canale?: string; // "APP"
  honeypot?: string;

  // ENG (fallback)
  name?: string;
  phone?: string;
  type?: string;
  date?: string;
  time?: string;
  order?: string;
  address?: string;
  people?: string;
  allergies?: string[] | string;
  business?: string;
  source?: string;
};

function isValidDate(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}
function isValidTime(v: string) {
  return /^\d{2}:\d{2}$/.test(v);
}

export async function POST(req: NextRequest) {
  try {
    const BOOKING_WEBAPP_URL = process.env.BOOKING_WEBAPP_URL;

    if (!BOOKING_WEBAPP_URL) {
      return NextResponse.json(
        { error: "BOOKING_WEBAPP_URL mancante (configura su .env.local e su Vercel)." },
        { status: 500 }
      );
    }

    const body = (await req.json().catch(() => null)) as BookingPayload | null;

    // anti-spam
    if (body?.honeypot && String(body.honeypot).trim().length > 0) {
      return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 });
    }

    // ✅ mapping IT/ENG
    const nome = (body?.nome ?? body?.name ?? "").toString().trim();
    const telefono = (body?.telefono ?? body?.phone ?? "").toString().trim();
    const tipoRaw = (body?.tipo ?? body?.type ?? "").toString().trim().toUpperCase();
    const data = (body?.data ?? body?.date ?? "").toString().trim();
    const ora = (body?.ora ?? body?.time ?? "").toString().trim();
    const ordine = (body?.ordine ?? body?.order ?? "").toString().trim();

    const indirizzo = (body?.indirizzo ?? body?.address ?? "").toString().trim();
    const persone = (body?.persone ?? body?.people ?? "").toString().trim();
    const pagamento = (body?.pagamento ?? "").toString().trim();
    const note = (body?.note ?? "").toString().trim();

    let allergeni = (body?.allergeni ?? "").toString().trim();
    const a2 = body?.allergies;
    if (!allergeni && Array.isArray(a2)) allergeni = a2.filter(Boolean).join(", ");
    if (!allergeni && typeof a2 === "string") allergeni = a2;

    const negozio = (body?.negozio ?? body?.business ?? "Pala Pizza").toString().trim();
    const canale = (body?.canale ?? body?.source ?? "APP").toString().trim().toUpperCase();

    const tipo = tipoRaw as "ASPORTO" | "CONSEGNA" | "TAVOLO";

    // ✅ validazioni: per tavolo ordine può essere vuoto
    if (!nome || !telefono || !tipo || !data || !ora) {
      return NextResponse.json(
        { error: "Campi obbligatori mancanti (nome, telefono, tipo, data, ora)." },
        { status: 400 }
      );
    }

    if (!["ASPORTO", "CONSEGNA", "TAVOLO"].includes(tipo)) {
      return NextResponse.json({ error: "Tipo non valido." }, { status: 400 });
    }
    if (!isValidDate(data)) {
      return NextResponse.json({ error: "Formato data non valido (YYYY-MM-DD)." }, { status: 400 });
    }
    if (!isValidTime(ora)) {
      return NextResponse.json({ error: "Formato ora non valido (HH:mm)." }, { status: 400 });
    }

    if (tipo === "CONSEGNA" && !indirizzo) {
      return NextResponse.json({ error: "Per la consegna serve l’indirizzo." }, { status: 400 });
    }
    if (tipo === "TAVOLO" && !persone) {
      return NextResponse.json({ error: "Per il tavolo serve il numero persone." }, { status: 400 });
    }
    if (tipo !== "TAVOLO" && !ordine) {
      return NextResponse.json({ error: "Per asporto/consegna serve l’ordine." }, { status: 400 });
    }

    const forward = {
      ts: new Date().toISOString(),
      negozio,
      nome,
      telefono,
      tipo,
      data,
      ora,
      ordine: tipo === "TAVOLO" ? (ordine || "Prenotazione tavolo") : ordine,
      indirizzo: tipo === "CONSEGNA" ? indirizzo : "",
      persone: tipo === "TAVOLO" ? persone : "",
      pagamento,
      allergeni,
      note,
      stato: "NUOVO",
      canale,
    };

    const res = await fetch(BOOKING_WEBAPP_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(forward),
    });

    const text = await res.text().catch(() => "");
    if (!res.ok) {
      return NextResponse.json(
        { error: `Errore pannello: ${res.status} ${res.statusText}`, details: text },
        { status: 502 }
      );
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // ok
    }

    return NextResponse.json({
      ok: true,
      message: "Ricevuto ✅ Il locale confermerà appena possibile.",
      response: parsed ?? text,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Errore server /api/bookings", details: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({ ok: true });
}