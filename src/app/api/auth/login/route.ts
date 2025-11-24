import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { verifyPassword, signJwt } from "@/lib/auth";
import { env } from "@/lib/env";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as Partial<{ email: string; password: string }> | null;
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  if (!email || !password) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe email e senha." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SELECT id, email, name, password_salt, password_hash FROM users WHERE email = ? LIMIT 1", [email]);
    if (!rows.length) return new Response(JSON.stringify({ error: "invalid_credentials", message: "Credenciais inválidas." }), { status: 401, headers: { "Content-Type": "application/json" } });
    const u = rows[0] as RowDataPacket;
    const ok = verifyPassword(password, String(u["password_salt"]), String(u["password_hash"]));
    if (!ok) return new Response(JSON.stringify({ error: "invalid_credentials", message: "Credenciais inválidas." }), { status: 401, headers: { "Content-Type": "application/json" } });
    const token = signJwt({ sub: String(u["id"]), email: String(u["email"]) }, env.AUTH_SECRET, 60 * 60 * 24 * 7);
    return new Response(JSON.stringify({ token, user: { id: String(u["id"]), email: String(u["email"]), name: String(u["name"] || "") } }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "db_error", message: "Falha no login." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
