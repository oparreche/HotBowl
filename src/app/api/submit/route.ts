import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || "";
  const surveyId = url.searchParams.get("surveyId") || "";
  const bodyUnknown = (await request.json().catch(() => null)) as unknown;
  const answers = (bodyUnknown && typeof bodyUnknown === "object" && (bodyUnknown as { answers?: Record<string, unknown> }).answers) || null;
  if (!siteId || !surveyId || !answers) return new Response("invalid", { status: 400 });
  const ua = request.headers.get("user-agent") || "";
  try {
    await pool.query("INSERT INTO survey_responses (survey_id, site_id, answers, user_agent) VALUES (?, ?, ?, ?)", [surveyId, siteId, JSON.stringify(answers), ua]);
    return new Response(null, { status: 201 });
  } catch {
    return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
