"use client";
import { useEffect, useMemo, useState } from "react";

type Resp = { id: number; surveyId: string; siteId: string; answers: Record<string, unknown>; userAgent: string; createdAt: string };
type RespPage = { items: Resp[]; page: number; pageSize: number; total: number };

export default function AdminResponses() {
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

  useEffect(() => {
    const ctrl = new AbortController();
    const qs = new URLSearchParams();
    if (surveyId) qs.set("surveyId", surveyId);
    if (siteId) qs.set("siteId", siteId);
    qs.set("page", String(page));
    qs.set("pageSize", String(pageSize));
    fetch(`/api/admin/responses?${qs.toString()}`, { cache: "no-store", signal: ctrl.signal })
      .then(async (r) => (r.ok && r.headers.get("content-type")?.includes("application/json")) ? r.json() : { items: [], total: 0, page: 1, pageSize })
      .then((data: RespPage) => { setItems(Array.isArray(data.items) ? data.items : []); setTotal(Number(data.total || 0)); })
      .catch(() => setItems([]));
    return () => ctrl.abort();
  }, [surveyId, siteId, page, pageSize]);

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Responses</h1>
        <a href="/admin/surveys" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>Voltar para Surveys</a>
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 720, marginTop: 16 }}>
        <input placeholder="Survey ID" value={surveyId} onChange={(e) => setSurveyId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <input placeholder="Site ID" value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <button onClick={() => { setPage(1); }} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer" }}>Buscar</button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: 6, borderRadius: 8, border: "1px solid #ddd" }}>
            {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/página</option>)}
          </select>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {items.map((r) => (
            <li key={r.id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, marginBottom: 12, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div>
                  <strong>{r.surveyId}</strong>
                  <div style={{ fontSize: 12, color: "#667085" }}>{new Date(r.createdAt).toLocaleString()}</div>
                </div>
                <div style={{ fontSize: 12, color: "#667085" }}>{r.siteId}</div>
              </div>
              <pre style={{ marginTop: 10, background: "#0f172a", color: "#e5e7eb", borderRadius: 8, padding: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{JSON.stringify(r.answers, null, 2)}</pre>
              <div style={{ fontSize: 12, color: "#667085", marginTop: 6 }}>UA: {r.userAgent}</div>
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
