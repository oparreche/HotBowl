import { NextRequest } from "next/server";
import { pool } from "@/lib/db";
import type { Question } from "@/lib/types";
import type { RowDataPacket } from "mysql2";
import { validateSurveyInput } from "@/lib/validate";
import { verifyJwt } from "@/lib/auth";
import { env } from "@/lib/env";

async function hasUserScope(): Promise<boolean> {
  try {
    const [rows] = await pool.query<RowDataPacket[]>("SHOW COLUMNS FROM surveys LIKE 'user_id'");
    return Array.isArray(rows) && rows.length > 0;
  } catch {
    return false;
  }
}

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId") || "";
  const pageParam = request.nextUrl.searchParams.get("page") || "1";
  const pageSizeParam = request.nextUrl.searchParams.get("pageSize") || "10";
  const page = Math.max(1, Number(pageParam) || 1);
  const pageSize = Math.max(1, Math.min(100, Number(pageSizeParam) || 10));
  const offset = (page - 1) * pageSize;
  try {
    const auth = request.headers.get("authorization") || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
    const { valid, payload } = verifyJwt(token, env.AUTH_SECRET);
    const userId = valid && typeof payload?.sub === "string" ? (payload!.sub as string) : "";
    const scoped = await hasUserScope();
    const filters: string[] = [];
    const params: (string | number)[] = [];
    if (scoped) {
      if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      filters.push("user_id = ?");
      params.push(userId);
    }
    if (siteId) { filters.push("site_id = ?"); params.push(siteId); }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const listParams = [...params, pageSize, offset];
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, site_id, title, questions, is_active, created_at
       FROM surveys ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      listParams
    );
    const items = rows.map((r: RowDataPacket) => {
      const raw = r["questions"] as unknown;
      const qs: Question[] = typeof raw === "string"
        ? JSON.parse(raw)
        : Array.isArray(raw) || typeof raw === "object"
        ? (raw as Question[])
        : [];
      return {
        id: String(r["id"]),
        siteId: String(r["site_id"]),
        title: String(r["title"]),
        questions: qs,
        isActive: Boolean(r["is_active"]),
        createdAt: r["created_at"] as Date,
        responses: 0,
        views: 0,
      };
    });

    // total para paginação
    const countParams = params;
    const [countRows] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM surveys ${where}`,
      countParams
    );
    const total = Number((countRows[0] as RowDataPacket)["total"] || 0);

    // contadores de respostas e views (robusto: se tabelas não existirem, zera)
    const ids = items.map((i) => i.id);
    if (ids.length) {
      try {
        const [respRows] = await pool.query<RowDataPacket[]>(
          `SELECT survey_id, COUNT(*) as cnt FROM survey_responses WHERE survey_id IN (${ids.map(() => "?").join(",")}) GROUP BY survey_id`,
          ids
        );
        const [viewRows] = await pool.query<RowDataPacket[]>(
          `SELECT survey_id, COUNT(*) as cnt FROM survey_views WHERE survey_id IN (${ids.map(() => "?").join(",")}) GROUP BY survey_id`,
          ids
        );
        const respMap = new Map<string, number>();
        const viewMap = new Map<string, number>();
        respRows.forEach((r) => respMap.set(String(r["survey_id"]), Number(r["cnt"] || 0)));
        viewRows.forEach((v) => viewMap.set(String(v["survey_id"]), Number(v["cnt"] || 0)));
        items.forEach((i) => {
          i.responses = respMap.get(i.id) || 0;
          i.views = viewMap.get(i.id) || 0;
        });
      } catch {
        // ignora erros de contagem
      }
    }

    return new Response(JSON.stringify({ items, page, pageSize, total }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response(JSON.stringify({ error: "db_error" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function POST(request: NextRequest) {
  const bodyUnknown = (await request.json().catch(() => null)) as unknown;
  const body = bodyUnknown as Partial<{ siteId: string; title: string; questions: Question[] }> | null;
  const siteId = body?.siteId ?? "";
  const title = body?.title ?? "";
  const questions = body?.questions ?? [];
  const issues = validateSurveyInput(siteId, title, questions);
  if (issues.length) {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Erros de validação", issues }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { valid, payload } = verifyJwt(token, env.AUTH_SECRET);
  const userId = valid && typeof payload?.sub === "string" ? (payload!.sub as string) : "";
  const id = crypto.randomUUID();
  try {
    const scoped = await hasUserScope();
    if (scoped) {
      if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      await pool.query("INSERT INTO surveys (id, user_id, site_id, title, questions, is_active) VALUES (?, ?, ?, ?, ?, 1)", [id, userId, siteId, title, JSON.stringify(questions)]);
    } else {
      await pool.query("INSERT INTO surveys (id, site_id, title, questions, is_active) VALUES (?, ?, ?, ?, 1)", [id, siteId, title, JSON.stringify(questions)]);
    }
    return new Response(JSON.stringify({ id }), { status: 201, headers: { "Content-Type": "application/json" } });
  } catch (e: unknown) {
    const msg = typeof e === "object" && e && (e as { message?: string }).message ? String((e as { message?: string }).message) : "Falha ao inserir survey.";
    return new Response(JSON.stringify({ error: "db_error", message: msg }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}

export async function PATCH(request: NextRequest) {
  const bodyUnknown = (await request.json().catch(() => null)) as unknown;
  const body = bodyUnknown as Partial<{ id: string; isActive: boolean }> | null;
  const id = body?.id ?? "";
  const isActive = body?.isActive;
  if (!id || typeof isActive !== "boolean") {
    return new Response(JSON.stringify({ error: "invalid_input", message: "Informe id e isActive (boolean)." }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  const auth = request.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  const { valid, payload } = verifyJwt(token, env.AUTH_SECRET);
  const userId = valid && typeof payload?.sub === "string" ? (payload!.sub as string) : "";
  try {
    const scoped = await hasUserScope();
    if (scoped) {
      if (!userId) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { "Content-Type": "application/json" } });
      await pool.query("UPDATE surveys SET is_active = ? WHERE id = ? AND user_id = ?", [isActive ? 1 : 0, id, userId]);
    } else {
      await pool.query("UPDATE surveys SET is_active = ? WHERE id = ?", [isActive ? 1 : 0, id]);
    }
    return new Response(null, { status: 204 });
  } catch {
    return new Response(JSON.stringify({ error: "db_error", message: "Falha ao atualizar survey." }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
