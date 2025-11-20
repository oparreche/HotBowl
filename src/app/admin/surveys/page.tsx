"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { validateSurveyInput } from "@/lib/validate";
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
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
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
    setIssues([]);
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
    const localIssues = validateSurveyInput(payloadSiteId, title.trim(), questions);
    if (localIssues.length) {
      setIssues(localIssues);
      setJsonError(["Corrija os campos abaixo:", ...localIssues.map((i) => `${i.path}: ${i.message}`)].join("\n"));
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
        <CreateSurveyModal
          open
          onClose={() => setOpenModal(false)}
          newSiteId={newSiteId}
          setNewSiteId={setNewSiteId}
          title={title}
          setTitle={setTitle}
          questionsJson={questionsJson}
          setQuestionsJson={setQuestionsJson}
          jsonError={jsonError}
          issues={issues}
          onSubmit={createSurvey}
        />
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
    <div style={{ background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 8, padding: 12, overflowX: "hidden" }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Tipos de campos suportados</div>
      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13 }}>
        <li><strong>text</strong>: campo de texto curto</li>
        <li><strong>textarea</strong>: campo de texto longo</li>
        <li><strong>select</strong>: seleção única com <code>options</code></li>
        <li><strong>radio</strong>: múltipla escolha única com <code>options</code></li>
      </ul>
      <div style={{ marginTop: 8, fontSize: 12 }}>Exemplo:</div>
      <pre style={{ marginTop: 6, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, padding: 8, overflowX: "hidden", overflowY: "auto", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{example}</pre>
    </div>
  );
}

type CreateSurveyModalProps = {
  open: boolean;
  onClose: () => void;
  newSiteId: string;
  setNewSiteId: (v: string) => void;
  title: string;
  setTitle: (v: string) => void;
  questionsJson: string;
  setQuestionsJson: (v: string) => void;
  jsonError: string | null;
  issues: { path: string; message: string }[];
  onSubmit: () => void | Promise<void>;
};

function CreateSurveyModal({ onClose, newSiteId, setNewSiteId, title, setTitle, questionsJson, setQuestionsJson, jsonError, issues, onSubmit }: CreateSurveyModalProps) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const siteRef = useRef<HTMLInputElement | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { setClosing(true); setTimeout(onClose, 300); } };
    document.addEventListener("keydown", esc);
    const focusables = () => Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])") || []);
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !dialogRef.current?.contains(active)) { last.focus(); e.preventDefault(); }
      } else {
        if (active === last || !dialogRef.current?.contains(active)) { first.focus(); e.preventDefault(); }
      }
    };
    document.addEventListener("keydown", trap);
    const t = setTimeout(() => { siteRef.current?.focus(); }, 0);
    return () => { document.removeEventListener("keydown", esc); document.removeEventListener("keydown", trap); clearTimeout(t); };
  }, [onClose]);
  const insertExample = () => setQuestionsJson("[\n  {\"id\":\"q1\",\"type\":\"text\",\"prompt\":\"Qual sua opinião?\"},\n  {\"id\":\"q2\",\"type\":\"select\",\"prompt\":\"Como nos conheceu?\",\"options\":[\"Google\",\"Amigo\",\"Redes sociais\"]}\n]");
  const handleClose = () => { setClosing(true); setTimeout(onClose, 300); };
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => { if (e.target === overlayRef.current) handleClose(); };
  return (
    <div ref={overlayRef} onClick={handleOverlayClick} role="dialog" aria-modal="true" aria-label="Criar Survey" style={{ position: "fixed", inset: 0, background: closing ? "rgba(0,0,0,0)" : "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 10000, transition: "background 300ms ease" }}>
      <div ref={dialogRef} style={{ width: "min(640px, 92vw)", maxHeight: "90vh", background: "#fff", color: "#111", borderRadius: 16, boxShadow: "0 16px 38px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", opacity: closing ? 0 : 1, transform: `translateY(${closing ? 10 : 0}px)`, transition: "opacity 300ms ease, transform 300ms ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottom: "1px solid #eee" }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Criar Survey</h2>
          <button onClick={handleClose} aria-label="Fechar" style={{ border: 0, background: "transparent", cursor: "pointer", width: 32, height: 32, borderRadius: 8, display: "grid", placeItems: "center", transition: "background 150ms ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f2f4f7")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>×</button>
        </div>
        <div style={{ padding: 20, overflowY: "auto", overflowX: "hidden" }}>
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Site ID</label>
              <input ref={siteRef} placeholder="ex: meusite.com" value={newSiteId} onChange={(e) => setNewSiteId(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: `1px solid ${issues.some((i) => i.path === "siteId") ? "#ef4444" : "#d1d5db"}`, outline: "none", transition: "border-color 150ms ease" }} />
              {issues.filter((i) => i.path === "siteId").map((i, idx) => (<div key={idx} style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{i.message}</div>))}
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Título</label>
              <input placeholder="ex: Pesquisa de satisfação" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: `1px solid ${issues.some((i) => i.path === "title") ? "#ef4444" : "#d1d5db"}`, outline: "none", transition: "border-color 150ms ease" }} />
              {issues.filter((i) => i.path === "title").map((i, idx) => (<div key={idx} style={{ color: "#b91c1c", fontSize: 12, marginTop: 4 }}>{i.message}</div>))}
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Questions JSON</label>
                <button onClick={insertExample} style={{ border: "1px solid #d1d5db", background: "#fff", color: "#111", borderRadius: 10, padding: "6px 10px", cursor: "pointer", fontSize: 12, transition: "background 150ms ease, transform 100ms ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>Inserir exemplo</button>
              </div>
              <textarea placeholder="Cole aqui o array de perguntas" value={questionsJson} onChange={(e) => setQuestionsJson(e.target.value)} rows={8} wrap="soft" style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: `1px solid ${issues.some((i) => i.path.startsWith("questions")) ? "#ef4444" : "#d1d5db"}`, fontFamily: "monospace", outline: "none", transition: "border-color 150ms ease", overflowX: "hidden" }} />
              {jsonError && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 4, whiteSpace: "pre-wrap" }}>{jsonError}</div>}
            </div>
            <FieldTypesHelp />
          </div>
        </div>
        <div style={{ padding: 20, borderTop: "1px solid #eee", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button onClick={handleClose} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", color: "#111", cursor: "pointer", transition: "background 150ms ease, transform 100ms ease" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")} onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>Cancelar</button>
          <button onClick={() => onSubmit()} style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#111", color: "#fff", cursor: "pointer", transition: "opacity 150ms ease, transform 100ms ease" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>Criar</button>
        </div>
      </div>
    </div>
  );
}
