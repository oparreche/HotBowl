"use client";
import { useEffect, useMemo, useState } from "react";

type Resp = { id: number; surveyId: string; siteId: string; answers: Record<string, unknown>; userAgent: string; createdAt: string };
type RespPage = { items: Resp[]; page: number; pageSize: number; total: number };
type SurveyDetail = { id: string; siteId: string; title: string; questions: { id: string; prompt: string }[] };

export default function AdminResponses() {
  const [tokenChecked, setTokenChecked] = useState(false);
  const params = useMemo(() => {
    if (typeof window === "undefined") return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);
  const initialSurveyId = params.get("surveyId") || "";
  const initialSiteId = params.get("siteId") || "";
  const [surveyId, setSurveyId] = useState(initialSurveyId);
  const [siteId, setSiteId] = useState(initialSiteId);
  const [items, setItems] = useState<Resp[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [detail, setDetail] = useState<SurveyDetail | null>(null);
  const qLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    (detail?.questions || []).forEach((q) => { map[q.id] = q.prompt; });
    return map;
  }, [detail]);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("hb_token") : null;
    setTokenChecked(true);
    if (!t && typeof window !== "undefined") window.location.href = "/login";
    const ctrl = new AbortController();
    const qs = new URLSearchParams();
    if (surveyId) qs.set("surveyId", surveyId);
    if (siteId) qs.set("siteId", siteId);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    if (t) {
      fetch(`/api/admin/responses?${qs.toString()}`, { cache: "no-store", signal: ctrl.signal, headers: { Authorization: `Bearer ${t}` } })
        .then(async (r) => (r.ok && r.headers.get("content-type")?.includes("application/json")) ? r.json() : { items: [], total: 0, page: 1, pageSize })
        .then((data: RespPage) => { setItems(Array.isArray(data.items) ? data.items : []); setTotal(Number(data.total || 0)); })
        .catch(() => setItems([]));
    }
    return () => ctrl.abort();
  }, [surveyId, siteId, page, pageSize]);

  useEffect(() => {
    const ctrl = new AbortController();
    if (!surveyId) { setDetail(null); return; }
    const qs = new URLSearchParams();
    qs.set("surveyId", surveyId);
    if (siteId) qs.set("siteId", siteId);
    const t = typeof window !== "undefined" ? localStorage.getItem("hb_token") : null;
    fetch(`/api/admin/surveys/detail?${qs.toString()}`, { cache: "no-store", signal: ctrl.signal, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}) } })
      .then(async (r) => (r.ok && r.headers.get("content-type")?.includes("application/json")) ? r.json() : null)
      .then((d: SurveyDetail | null) => setDetail(d))
      .catch(() => setDetail(null));
    return () => ctrl.abort();
  }, [surveyId, siteId]);

  if (!tokenChecked) return <div style={{ padding: 24 }}>Carregando...</div>;
  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Responses</h1>
        <a href="/admin/surveys" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>Voltar para Surveys</a>
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 880, marginTop: 16 }}>
        <input placeholder="Survey ID" value={surveyId} onChange={(e) => setSurveyId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <input placeholder="Site ID" value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => { setPage(1); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer" }}>Buscar</button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: 6, borderRadius: 8, border: "1px solid #ddd" }}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/página</option>)}
          </select>
        </div>
        {detail && (
          <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 16, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <strong style={{ fontSize: 16 }}>{detail.title}</strong>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "#eef2ff", color: "#3730a3" }}>{detail.siteId}</span>
                  <span style={{ fontSize: 12, color: "#667085" }}>{detail.questions.length} perguntas</span>
                </div>
              </div>
              <a href={`/admin/surveys?siteId=${detail.siteId}`} style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>Ver survey</a>
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 24 }}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((r) => (
            <li key={r.id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 16, marginBottom: 12, background: "#fff", boxShadow: "0 10px 24px rgba(0,0,0,0.06)", overflow: "hidden" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ display: "grid", gap: 2 }}>
                  <strong>{detail?.title || r.surveyId}</strong>
                  <div style={{ fontSize: 12, color: "#667085" }}>{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: "#f2f4f7", color: "#667085" }}>{r.siteId}</span>
              </div>
              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {Object.entries(r.answers || {}).map(([k, v]) => (
                  <PrettyAnswer key={k} prompt={qLabelMap[k] || String(k)} value={v as unknown} />
                ))}
              </div>
              <div style={{ fontSize: 12, color: "#667085", marginTop: 10 }}>UA: {r.userAgent}</div>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: page > 1 ? "pointer" : "not-allowed" }}>◀️ Anterior</button>
          <div style={{ fontSize: 12, color: "#667085" }}>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</div>
          <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: page < Math.ceil(total / pageSize) ? "pointer" : "not-allowed" }}>Próxima ▶️</button>
        </div>
      </div>
    </div>
  );
}

function formatAnswer(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

type PrettyAnswerProps = { prompt: string; value: unknown };
function PrettyAnswer({ prompt, value }: PrettyAnswerProps) {
  const [expanded, setExpanded] = useState(false);
  const full = formatAnswer(value);
  const limit = 180;
  const isLong = full.length > limit;
  const snippet = isLong && !expanded ? full.slice(0, limit) + "…" : full;
  const copy = async () => { try { await navigator.clipboard.writeText(full); } catch {} };
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ fontSize: 12, color: "#667085" }}>{prompt}</label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, fontSize: 13, color: "#111", background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 10, padding: 10, maxWidth: "100%", whiteSpace: "pre-wrap", wordBreak: "break-word", overflowWrap: "anywhere", lineHeight: 1.5 }}>{snippet}</div>
        <div style={{ display: "flex", gap: 6 }}>
          {isLong && (
            <button onClick={() => setExpanded((e) => !e)} style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#111", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>{expanded ? "Ver menos" : "Ver mais"}</button>
          )}
          <button onClick={copy} title="Copiar resposta" style={{ border: "1px solid #e5e7eb", background: "#fff", color: "#111", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Copiar</button>
        </div>
      </div>
    </div>
  );
}
