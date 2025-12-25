import { notFound } from "next/navigation";
import LoginClient from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<{ key?: string }> | { key?: string };
}) {
  const sp: any = await Promise.resolve(searchParams as any);

  // key dal link: /pannello/login?key=XXXX
  const provided = String(sp?.key ?? "").trim();

  // key segreta presa da Vercel / .env.local
  const expected = String(process.env.STAFF_LINK_KEY ?? "").trim();

  // se non esiste la variabile, blocca
  if (!expected) return notFound();

  // se la key nel link è sbagliata o mancante => 404
  if (provided !== expected) return notFound();

  // ok: mostro il form login vero (password)
  return <LoginClient />;
}