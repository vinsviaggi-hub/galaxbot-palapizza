// app/api/chat/route.ts
import { NextResponse } from "next/server";
import OpenAI from "openai";

const apiKey = process.env.OPENAI_API_KEY;

const client = new OpenAI({
  apiKey: apiKey ?? "",
});

export async function POST(req: Request) {
  try {
    if (!apiKey) {
      console.error("❌ OPENAI_API_KEY mancante (.env.local)");
      return NextResponse.json(
        { error: "OPENAI_API_KEY non configurata sul server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    const userMessage = body?.message?.toString().trim();

    if (!userMessage) {
      return NextResponse.json(
        { error: "Messaggio mancante nella richiesta." },
        { status: 400 }
      );
    }

    const prompt =
      "Sei GalaxBot, un assistente personale che risponde in ITALIANO, " +
      "con tono amichevole ma concreto. Rispondi in modo chiaro e breve (max 6–7 frasi). " +
      "Non dire mai che sei un modello di intelligenza artificiale.\n\n" +
      "Domanda dell'utente:\n" +
      userMessage;

    const response = await client.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    // 👇 QUI prendiamo il testo dal campo giusto
    const r: any = response;
    let reply = "";

    const ot = r.output_text;

    if (Array.isArray(ot)) {
      // se è un array, uniamo i pezzi
      reply = ot
        .map((p: any) =>
          typeof p === "string"
            ? p
            : p.text?.value ?? p.text ?? ""
        )
        .join("\n")
        .trim();
    } else if (typeof ot === "string") {
      // se è una stringa singola (come nel tuo log)
      reply = ot.trim();
    }

    // fallback: se in futuro cambia formato
    if (!reply && Array.isArray(r.output)) {
      const parts: string[] = [];
      for (const item of r.output) {
        for (const c of item.content ?? []) {
          if (c.type === "output_text" && c.text?.value) {
            parts.push(c.text.value);
          } else if (c.text) {
            parts.push(c.text);
          }
        }
      }
      reply = parts.join("\n").trim();
    }

    if (!reply) {
      console.error("⚠️ Risposta OpenAI vuota:", JSON.stringify(response, null, 2));
      return NextResponse.json(
        { error: "Risposta vuota dal modello." },
        { status: 500 }
      );
    }

    return NextResponse.json({ reply }, { status: 200 });
  } catch (err: any) {
    console.error("💥 Errore interno /api/chat:", err?.message ?? err);
    return NextResponse.json(
      { error: "Errore interno nella risposta del bot." },
      { status: 500 }
    );
  }
}