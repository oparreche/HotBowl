import { NextRequest } from "next/server";
import { pool } from "@/lib/db";

export async function POST(request: NextRequest) {
  const url = request.nextUrl;
  const siteId = url.searchParams.get("siteId") || "";
  const surveyId = url.searchParams.get("surveyId") || "";
  if (!siteId || !surveyId) return new Response("invalid", { status: 400 });
  try {
    await pool.query(
      "CREATE TABLE IF NOT EXISTS survey_views (id BIGINT AUTO_INCREMENT PRIMARY KEY, survey_id VARCHAR(36) NOT NULL, site_id VARCHAR(128) NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, INDEX idx_survey (survey_id))"
    );
    await pool.query("INSERT INTO survey_views (survey_id, site_id) VALUES (?, ?)", [surveyId, siteId]);
    return new Response(null, { status: 201 });
  } catch {
    return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
