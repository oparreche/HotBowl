import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Partial<{ email: string; name?: string; password: string }> | null;
  const email = (body?.email || "").trim().toLowerCase();
  const name = (body?.name || "").trim();
  const password = body?.password || "";
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe email e senha." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: "invalid_email", message: "Email inválido." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (password.length < 6) {
    return new Response(JSON.stringify({ error: "weak_password", message: "Senha muito curta (mín. 6)." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const id = crypto.randomUUID();
  const { salt, hash } = hashPassword(password);
  try {
    await pool.query("INSERT INTO users (id, email, name, password_salt, password_hash) VALUES (?, ?, ?, ?, ?)", [id, email, name || null, salt, hash]);
    return new Response(JSON.stringify({ id, email, name }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = typeof e === "object" && e && (e as { message?: string }).message ? String((e as { message?: string }).message) : "Falha ao cadastrar.";
    const isDup = msg.toLowerCase().includes("duplicate") || msg.toLowerCase().includes("unique");
    return new Response(JSON.stringify({ error: isDup ? "email_taken" : "db_error", message: isDup ? "Email já cadastrado." : msg }), { status: isDup ? 409 : 500, headers: { "Content-Type": "application/json" } });
  }
}
