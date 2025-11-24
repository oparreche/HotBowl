import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { RowDataPacket } from "mysql2";

export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || "";
  const surveyId = url.searchParams.get("surveyId") || "";
  const bodyUnknown = (await request.json().catch(() => null)) as unknown;
  const answers = (bodyUnknown && typeof bodyUnknown === "object" && (bodyUnknown as { answers?: Record<string, unknown> }).answers) || null;
  if (!siteId || !surveyId || !answers) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe siteId e surveyId na URL e answers no corpo." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const ua = request.headers.get("user-agent") || "";
  try {
    // opcional: vincular resposta ao user_id proprietário da survey, se coluna existir
    let userId: string | null = null;
    try {
      const [urows] = await pool.query<RowDataPacket[]>("SELECT user_id FROM surveys WHERE id = ? LIMIT 1", [surveyId]);
      if (Array.isArray(urows) && urows.length) {
        const u = urows[0] as RowDataPacket;
        userId = (u["user_id"] as string) || null;
      }
    } catch {}
    if (userId) {
      await pool.query("INSERT INTO survey_responses (survey_id, user_id, site_id, answers, user_agent) VALUES (?, ?, ?, ?, ?)", [surveyId, userId, siteId, JSON.stringify(answers), ua]);
    } else {
      await pool.query("INSERT INTO survey_responses (survey_id, site_id, answers, user_agent) VALUES (?, ?, ?, ?)", [surveyId, siteId, JSON.stringify(answers), ua]);
    }
    return new Response(null, { status: 201 });
  } catch {
    return new Response(JSON.stringify({ error: "db_error", message: "Falha ao salvar resposta." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
