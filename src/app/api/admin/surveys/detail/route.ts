import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import type { Question } from "@/lib/types";

export async function GET(request: NextRequest) {
  const surveyId = request.nextUrl.searchParams.get("surveyId") || "";
  const siteId = request.nextUrl.searchParams.get("siteId") || "";
  if (!surveyId) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe surveyId." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const where = siteId ? "WHERE id = ? AND site_id = ?" : "WHERE id = ?";
    const params = siteId ? [surveyId, siteId] : [surveyId];
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
