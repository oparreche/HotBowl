import { pool } from "@/lib/db";
// import { env } from "@/lib/env";
import type { Question, Survey } from "@/lib/types";
import type { RowDataPacket } from "mysql2";
import WidgetClient from "./WidgetClient";

type Props = { searchParams: { siteId?: string; surveyId?: string } };

async function getSurvey(siteId: string, surveyId: string): Promise<Survey | null> {
  const [rows] = await pool.query<RowDataPacket[]>(
    "SELECT id, site_id, title, questions FROM surveys WHERE id = ? AND site_id = ? AND is_active = 1 LIMIT 1",
    [surveyId, siteId]
  );
  if (!rows.length) return null;
  const s = rows[0] as RowDataPacket;
  const raw = s["questions"] as unknown;
  const qs: Question[] = typeof raw === "string"
    ? JSON.parse(raw)
    : Array.isArray(raw) || typeof raw === "object"
    ? (raw as Question[])
    : [];
  return {
    id: String(s["id"]),
    siteId: String(s["site_id"]),
    title: String(s["title"]),
    questions: qs,
  };
}

export default async function Widget({ searchParams }: Props) {
  const siteId = searchParams.siteId || "";
  const surveyId = searchParams.surveyId || "";
  if (!siteId || !surveyId) return null;
  const survey = await getSurvey(siteId, surveyId);
  if (!survey) return null;
  return <WidgetClient survey={survey} siteId={siteId} surveyId={surveyId} />;
}
