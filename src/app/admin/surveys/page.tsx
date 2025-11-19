"use client";
import { useEffect, useMemo, useState } from "react";
import type { Question } from "@/lib/types";

type Survey = { id: string; siteId: string; title: string; isActive: boolean; questions: Question[]; responses?: number; views?: number };
type SurveyPage = { items: Survey[]; page: number; pageSize: number; total: number };

export default function AdminSurveys() {
  const [siteId, setSiteId] = useState("");
  const [debouncedSiteId, setDebouncedSiteId] = useState("");
  const [list, setList] = useState<Survey[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [title, setTitle] = useState("");
  const [questionsJson, setQuestionsJson] = useState("[{\"id\":\"q1\",\"type\":\"text\",\"prompt\":\"Qual sua opinião?\"}]\n");
  const [openModal, setOpenModal] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [newSiteId, setNewSiteId] = useState("");
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"), []);

  // Debounce do siteId para evitar múltiplos requests por caractere
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSiteId(siteId.trim()), 500);
    return () => clearTimeout(t);
  }, [siteId]);

  useEffect(() => {
    const ctrl = new AbortController();
    const urlBase = debouncedSiteId ? `/api/admin/surveys?siteId=${encodeURIComponent(debouncedSiteId)}` : "/api/admin/surveys";
    const url = `${urlBase}${urlBase.includes("?") ? "&" : "?"}page=${page}&pageSize=${pageSize}`;
    fetch(url, { cache: "no-store", signal: ctrl.signal })
      .then(async (r) => (r.ok && r.headers.get("content-type")?.includes("application/json")) ? r.json() : { items: [], total: 0, page: 1, pageSize })
      .then((data: SurveyPage) => { setList(Array.isArray(data.items) ? data.items : []); setTotal(Number(data.total || 0)); })
      .catch(() => setList([]));
    return () => ctrl.abort();
  }, [debouncedSiteId, page, pageSize]);

  async function reload() {
    const url = debouncedSiteId ? `/api/admin/surveys?siteId=${encodeURIComponent(debouncedSiteId)}` : "/api/admin/surveys";
    const r = await fetch(`${url}${url.includes("?") ? "&" : "?"}page=${page}&pageSize=${pageSize}`, { cache: "no-store" });
    const isJson = r.ok && r.headers.get("content-type")?.includes("application/json");
    const data: SurveyPage = isJson ? await r.json().catch(() => ({ items: [], total: 0, page: 1, pageSize })) : { items: [], total: 0, page: 1, pageSize };
    setList(Array.isArray(data.items) ? data.items : []);
    setTotal(Number(data.total || 0));
  }

  async function createSurvey() {
    setJsonError(null);
    let questions: Question[] = [];
    try {
      questions = JSON.parse(questionsJson) as Question[];
      if (!Array.isArray(questions)) throw new Error("invalid");
    } catch {
      setJsonError("JSON inválido. Verifique o formato.");
      return;
    }
    const payloadSiteId = (newSiteId || debouncedSiteId || siteId).trim();
    if (!payloadSiteId) {
      setJsonError("Informe o Site ID.");
      return;
    }
    if (!title.trim()) {
      setJsonError("Informe o título da survey.");
      return;
    }
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId: payloadSiteId, title, questions }) });
    if (!res.ok) {
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await res.json().catch(() => null) : null;
      const msg = (payload && typeof payload === "object" && (payload as { message?: string }).message) || "Falha ao criar survey.";
      const issues = (payload && typeof payload === "object" && (payload as { issues?: { path: string; message: string }[] }).issues) || [] as { path: string; message: string }[];
      setJsonError([msg, ...issues.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`)].join("\n"));
      return;
    }
    // const isJson = res.headers.get("content-type")?.includes("application/json");
    setTitle("");
    setQuestionsJson("[]");
    setOpenModal(false);
    setSiteId(payloadSiteId);
    setDebouncedSiteId(payloadSiteId);
    await reload();
  }

  async function toggleActive(id: string, isActive: boolean) {
    const res = await fetch("/api/admin/surveys", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, isActive }) });
    if (res.ok || res.status === 204) setList(list.map((s) => (s.id === id ? { ...s, isActive } : s)));
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>SurveyHub</h1>
        <button onClick={() => { setNewSiteId(debouncedSiteId || siteId); setOpenModal(true); }} style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "linear-gradient(135deg,#06b6d4,#10b981)", color: "#fff", cursor: "pointer" }}>+ Criar Survey</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, marginTop: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#666", fontSize: 12 }}>Total Surveys</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{list.length}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#666", fontSize: 12 }}>Total Responses</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{list.reduce((sum, s) => sum + (s.responses || 0), 0)}</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div style={{ color: "#666", fontSize: 12 }}>Total Views</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{list.reduce((sum, s) => sum + (s.views || 0), 0)}</div>
        </div>
      </div>
      <div style={{ display: "grid", gap: 12, maxWidth: 720, marginTop: 16 }}>
        <input placeholder="Site ID" value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
        <button onClick={() => setDebouncedSiteId(siteId.trim())} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer", width: 120 }}>Buscar</button>
      </div>
      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Surveys</h2>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#667085" }}>Total: {total}</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} style={{ padding: 6, borderRadius: 8, border: "1px solid #ddd" }}>
              {[10, 20, 50].map((n) => <option key={n} value={n}>{n}/página</option>)}
            </select>
          </div>
        </div>
        <ul style={{ listStyle: "none", padding: 0 }}>
          {list.map((s) => (
            <li key={s.id} style={{ padding: 16, border: "1px solid #eee", borderRadius: 12, marginBottom: 12, background: "#fff", boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong>{s.title}</strong>
                  <div style={{ fontSize: 12, color: "#666" }}>{s.id}</div>
                </div>
                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <span style={{ fontSize: 12, padding: "4px 8px", borderRadius: 999, background: s.isActive ? "#e7f8ef" : "#f2f4f7", color: s.isActive ? "#0f766e" : "#667085" }}>{s.isActive ? "active" : "paused"}</span>
                  <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    Ativa
                    <input type="checkbox" checked={s.isActive} onChange={(e) => toggleActive(s.id, e.target.checked)} />
                  </label>
                </div>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 12, color: "#667085", fontSize: 13 }}>
                <span>{(s.responses || 0)} responses</span>
                <span>{(s.views || 0)} views</span>
              </div>
              <div style={{ marginTop: 10, fontSize: 12 }}>
                Script: <code>{`<script src="${origin}/api/embed?siteId=${s.siteId}&surveyId=${s.id}" async></script>`}</code>
              </div>
            </li>
          ))}
        </ul>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: page > 1 ? "pointer" : "not-allowed" }}>◀️ Anterior</button>
          <div style={{ fontSize: 12, color: "#667085" }}>Página {page} de {Math.max(1, Math.ceil(total / pageSize))}</div>
          <button disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage((p) => p + 1)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: page < Math.ceil(total / pageSize) ? "pointer" : "not-allowed" }}>Próxima ▶️</button>
        </div>
      </div>

      {openModal && (
        <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", display: "grid", placeItems: "center", zIndex: 10000 }}>
          <div style={{ width: "min(720px, 92vw)", background: "#fff", borderRadius: 12, padding: 16, boxShadow: "0 10px 24px rgba(0,0,0,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ margin: 0 }}>Criar Survey</h2>
              <button onClick={() => setOpenModal(false)} style={{ border: 0, background: "transparent", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
              <input placeholder="Site ID" value={newSiteId} onChange={(e) => setNewSiteId(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
              <input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
              <textarea placeholder="Questions JSON" value={questionsJson} onChange={(e) => setQuestionsJson(e.target.value)} rows={10} style={{ padding: 8, borderRadius: 8, border: "1px solid #ddd", fontFamily: "monospace" }} />
              {jsonError && <div style={{ color: "#b91c1c", fontSize: 12 }}>{jsonError}</div>}
              <FieldTypesHelp />
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button onClick={() => setOpenModal(false)} style={{ padding: "10px 16px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Cancelar</button>
                <button onClick={createSurvey} style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#111", color: "#fff", cursor: "pointer" }}>Criar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FieldTypesHelp() {
  const example = `[
  {"id":"q1","type":"text","prompt":"Qual sua opinião?"},
  {"id":"q2","type":"select","prompt":"Como nos conheceu?","options":["Google","Amigo","Redes sociais"]},
  {"id":"q3","type":"radio","prompt":"Você recomendaria?","options":["Sim","Não"]},
  {"id":"q4","type":"textarea","prompt":"Sugestões"}
]`;
  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Tipos de campos suportados</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        <li><strong>text</strong>: campo de texto curto</li>
        <li><strong>textarea</strong>: campo de texto longo</li>
        <li><strong>select</strong>: seleção única com <code>options</code></li>
        <li><strong>radio</strong>: múltipla escolha única com <code>options</code></li>
      </ul>
      <div style={{ marginTop: 8, fontSize: 12 }}>Exemplo:</div>
      <pre style={{ marginTop: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, overflow: "auto" }}>{example}</pre>
    </div>
  );
}
