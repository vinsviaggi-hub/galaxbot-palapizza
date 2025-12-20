"use client";

import React, { useMemo, useRef, useState } from "react";

type Role = "user" | "assistant";
type Msg = { id: string; role: Role; text: string; ts: string };

const QUICK = [
  "Menu pizze",
  "Senza glutine?",
  "Allergeni margherita",
  "Tempi consegna",
  "Bevande/dolci",
  "Zone consegna",
];

function uid() {
  return Math.random().toString(16).slice(2);
}

export default function ChatBox() {
  // ✅ timestamp iniziale fisso (evita mismatch SSR/Client)
  const initialMessages: Msg[] = [
    {
      id: "welcome",
      role: "assistant",
      ts: "2025-01-01T12:00:00.000Z",
      text:
        "Ciao! Sono l’assistente info di Pala Pizza 🍕\n" +
        "Posso aiutarti con:\n" +
        "• Menu e pizze disponibili\n" +
        "• Allergeni / senza glutine\n" +
        "• Tempi e zone di consegna\n\n" +
        "Per ordini/prenotazioni usa il modulo a sinistra ✅",
    },
  ];

  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat("it-IT", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "Europe/Rome",
      }),
    []
  );

  function formatTime(iso: string) {
    try {
      return timeFmt.format(new Date(iso));
    } catch {
      return "";
    }
  }

  function scrollToEnd() {
    requestAnimationFrame(() => endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }));
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    setLoading(true);

    const userMsg: Msg = { id: uid(), role: "user", ts: new Date().toISOString(), text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json().catch(() => null);
      const replyText =
        (data?.reply || data?.message || data?.response || "").toString().trim() ||
        "Ok 👍 Dimmi cosa ti serve su menu, allergeni o consegna.";

      const botMsg: Msg = { id: uid(), role: "assistant", ts: new Date().toISOString(), text: replyText };
      setMessages((m) => [...m, botMsg]);
      scrollToEnd();
    } catch {
      const botMsg: Msg = {
        id: uid(),
        role: "assistant",
        ts: new Date().toISOString(),
        text: "Errore momentaneo. Riprova tra poco.",
      };
      setMessages((m) => [...m, botMsg]);
      scrollToEnd();
    } finally {
      setLoading(false);
      scrollToEnd();
    }
  }

  return (
    <div className="chatWrap">
      <div className="quickRow">
        {QUICK.map((q) => (
          <button key={q} type="button" className="chip" onClick={() => send(q)} disabled={loading}>
            {q}
          </button>
        ))}
      </div>

      <div className="chatArea">
        {messages.map((m) => (
          <div key={m.id} className={`msgRow ${m.role}`}>
            <div className={`bubble ${m.role}`}>
              <div className="bubbleText">{m.text}</div>
              <div className="msgMeta">{m.role === "user" ? "Tu" : "Pala Pizza"} · {formatTime(m.ts)}</div>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="chatInputRow">
        <textarea
          className="textarea chatTextarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Scrivi qui la tua domanda…"
          disabled={loading}
        />
        <button className="btnPrimary chatSend" type="button" onClick={() => send(input)} disabled={loading || !input.trim()}>
          {loading ? "..." : "Invia"}
        </button>
      </div>
    </div>
  );
}