"use client";

import { useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();

    const trimmed = input.trim();
    if (!trimmed) return; // niente messaggio vuoto

    setError(null);
    setLoading(true);

    const newUserMsg: ChatMessage = { role: "user", content: trimmed };
    setMessages(prev => [...prev, newUserMsg]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        // 🔴 IMPORTANTE: la chiave si deve chiamare ESATTAMENTE "message"
        body: JSON.stringify({ message: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Errore nella risposta del bot");
      }

      const data = await res.json();
      const replyText: string = data.reply ?? "Nessuna risposta dal bot.";

      const botMsg: ChatMessage = { role: "assistant", content: replyText };
      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || "Errore imprevisto");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-xl border border-slate-800 rounded-xl p-4 bg-slate-900/70">
        <h1 className="text-xl font-semibold mb-3 text-center">
          GalaxBot Chat Solo
        </h1>

        <div className="h-80 overflow-y-auto border border-slate-800 rounded-lg p-3 mb-3 bg-black/30">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400">
              Scrivi un messaggio per iniziare a parlare con GalaxBot. 💬
            </p>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-slate-800 text-slate-50"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-400 mb-2">
            {error}
          </p>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Scrivi un messaggio…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-sm font-medium disabled:opacity-60"
          >
            {loading ? "..." : "Invia"}
          </button>
        </form>
      </div>
    </main>
  );
}