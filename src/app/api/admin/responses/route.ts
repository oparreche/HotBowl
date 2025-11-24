import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";
import { verifyJwt } from "@/lib/auth";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { valid, payload } = verifyJwt(token, env.AUTH_SECRET);
  const userId = valid && typeof payload?.sub === "string" ? (payload!.sub as string) : "";
  let hasUser = false;
  try {
    const [cols] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM survey_responses LIKE 'user_id'");
    hasUser = Array.isArray(cols) && cols.length > 0;
  } catch {}
  if (hasUser && !userId) {
    return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
  }
  const siteId = request.nextUrl.searchParams.get("siteId") || "";
  const surveyId = request.nextUrl.searchParams.get("surveyId") || "";
  const pageParam = request.nextUrl.searchParams.get("page") || "1";
  const pageSizeParam = request.nextUrl.searchParams.get("pageSize") || "10";
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(pageSizeParam) || 10));
  const offset = (page - 1) * pageSize;
  try {
          const filters: string[] = [];
          const params: (string | number)[] = [];
          if (hasUser) { filters.push("user_id = ?"); params.push(userId); }
          if (surveyId) { filters.push("survey_id = ?"); params.push(surveyId); }
          if (siteId) { filters.push("site_id = ?"); params.push(siteId); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, survey_id, site_id, answers, user_agent, created_at
       FROM survey_responses ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset]
    );
    const items = rows.map((r) => ({
      id: Number(r["id"]),
      surveyId: String(r["survey_id"]),
      siteId: String(r["site_id"]),
      answers: (() => { const raw = r["answers"] as unknown; try { return typeof raw === "string" ? JSON.parse(raw) : raw; } catch { return raw; } })(),
      userAgent: String(r["user_agent"] || ""),
      createdAt: r["created_at"] as Date,
    }));
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM survey_responses ${where}`,
      params
    );
    const total = Number((countRows[0] as RowDataPacket)["total"] || 0);
    return new Response(JSON.stringify({ items, page, pageSize, total }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "db_error", message: "Falha ao carregar respostas." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
