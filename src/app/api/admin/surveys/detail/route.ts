import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { Question } from "@/lib/types";
import { verifyJwt } from "@/lib/auth";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const surveyId = request.nextUrl.searchParams.get("surveyId") || "";
  const siteId = request.nextUrl.searchParams.get("siteId") || "";
  if (!surveyId) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe surveyId." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const { valid, payload } = verifyJwt(token, env.AUTH_SECRET);
    const userId = valid && typeof payload?.sub === "string" ? (payload!.sub as string) : "";
    const [cols] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM surveys LIKE 'user_id'");
    const hasUser = Array.isArray(cols) && cols.length > 0;
    const filters: string[] = [];
    const params: (string | number)[] = [];
    filters.push("id = ?"); params.push(surveyId);
    if (siteId) { filters.push("site_id = ?"); params.push(siteId); }
    if (hasUser) {
      if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      filters.push("user_id = ?"); params.push(userId);
    }
    const where = `WHERE ${filters.join(" AND ")}`;
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, site_id, title, questions FROM surveys ${where} LIMIT 1`,
      params
    );
    if (!rows.length) {
      return new Response(JSON.stringify({ error: "not_found", message: "Survey não encontrada." }), { status: 404, headers: { "Content-Type": "application/json" } });
    }
    const r = rows[0] as RowDataPacket;
    const raw = r["questions"] as unknown;
    const qs: Question[] = typeof raw === "string"
      ? JSON.parse(raw)
      : Array.isArray(raw) || typeof raw === "object"
      ? (raw as Question[])
      : [];
    return new Response(JSON.stringify({ id: String(r["id"]), siteId: String(r["site_id"]), title: String(r["title"]), questions: qs }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "db_error", message: "Falha ao carregar survey." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
