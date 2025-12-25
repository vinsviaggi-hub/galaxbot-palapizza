import { notFound } from "next/navigation";
import LoginClient from "./LoginClient";

export default function Page({
  searchParams,
}: {
  searchParams?: { key?: string };
}) {
  // key dal link: /pannello/login?key=XXXX
  const provided = (searchParams?.key || "").trim();

  // key segreta presa da Vercel / .env.local
  const expected = (process.env.STAFF_LINK_KEY || "").trim();

  // se non esiste la variabile, blocca
  if (!expected) return notFound();

  // se la key nel link è sbagliata o mancante => 404
  if (provided !== expected) return notFound();

  // ok: mostro il form login vero (password)
  return <LoginClient />;
}