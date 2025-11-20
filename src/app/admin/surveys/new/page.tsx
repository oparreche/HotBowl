"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Question } from "@/lib/types";
import { validateSurveyInput } from "@/lib/validate";

type QType = "text" | "textarea" | "select" | "radio";

export default function NewSurveyPage() {
  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [issues, setIssues] = useState<{ path: string; message: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(true);
  const dragFrom = useRef<number | null>(null);
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"), []);

  useEffect(() => {
    const i = validateSurveyInput(siteId.trim(), title.trim(), questions);
    setIssues(i);
  }, [siteId, title, questions]);

  function addQuestion(type: QType) {
    const idBase = `q${questions.length + 1}`;
    const exists = new Set(questions.map((q) => q.id));
    let id = idBase;
    let n = questions.length + 1;
    while (exists.has(id)) { n += 1; id = `q${n}`; }
    const q: Question = type === "text" || type === "textarea"
      ? { id, type, prompt: "" }
      : { id, type, prompt: "", options: ["Opção 1", "Opção 2"] } as unknown as Question;
    setQuestions((qs) => [...qs, q]);
  }

  function updateQuestion(idx: number, patch: Partial<Question>) {
    setQuestions((qs) => qs.map((q, i) => (i === idx ? { ...q, ...patch } : q)));
  }

  function removeQuestion(idx: number) {
    setQuestions((qs) => qs.filter((_, i) => i !== idx));
  }

  function onDragStart(idx: number) { dragFrom.current = idx; }
  function onDragOver(e: React.DragEvent) { e.preventDefault(); }
  function onDrop(idx: number) {
    const from = dragFrom.current;
    dragFrom.current = null;
    if (from === null || from === idx) return;
    setQuestions((qs) => {
      const arr = qs.slice();
      const [q] = arr.splice(from, 1);
      arr.splice(idx, 0, q);
      return arr;
    });
  }

  async function save() {
    setError(null);
    const i = validateSurveyInput(siteId.trim(), title.trim(), questions);
    if (i.length) { setIssues(i); setError(["Corrija os campos abaixo:", ...i.map((x) => `${x.path}: ${x.message}`)].join("\n")); return; }
    const res = await fetch("/api/admin/surveys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ siteId: siteId.trim(), title: title.trim(), questions }) });
    if (!res.ok) {
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const payload = isJson ? await res.json().catch(() => null) : null;
      const msg = (payload && typeof payload === "object" && (payload as { message?: string }).message) || "Falha ao criar survey.";
      const iss = (payload && typeof payload === "object" && (payload as { issues?: { path: string; message: string }[] }).issues) || [] as { path: string; message: string }[];
      setError([msg, ...iss.map((i: { path: string; message: string }) => `${i.path}: ${i.message}`)].join("\n"));
      return;
    }
    const data = await res.json().catch(() => ({ id: "" }));
    if (data?.id) {
      window.location.href = `/admin/surveys`;
    }
  }

  function renderQuestion(q: Question, idx: number) {
    const isSelect = q.type === "select";
    const isRadio = q.type === "radio";
    const needOptions = isSelect || isRadio;
    const border = issues.some((i) => i.path.startsWith(`questions[${idx}]`)) ? "#ef4444" : "#e5e7eb";
    return (
      <div key={q.id} draggable onDragStart={() => onDragStart(idx)} onDragOver={(e) => onDragOver(e)} onDrop={() => onDrop(idx)} style={{ border: `1px solid ${border}`, borderRadius: 12, padding: 12, background: "#fff" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 12, color: "#667085" }}>{q.id} · {q.type}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button title="Remover" onClick={() => removeQuestion(idx)} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Excluir</button>
          </div>
        </div>
        <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginTop: 10 }}>Pergunta</label>
        <input title="Texto exibido ao usuário" value={q.prompt || ""} onChange={(e) => updateQuestion(idx, { prompt: e.target.value })} style={{ width: "100%", boxSizing: "border-box", padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }} />
        {needOptions && (
          <div style={{ marginTop: 10 }}>
            <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Opções</label>
            <div style={{ display: "grid", gap: 8 }}>
              {Array.isArray((q as unknown as { options?: string[] }).options) && (q as unknown as { options: string[] }).options.map((opt, j) => (
                <div key={j} style={{ display: "flex", gap: 8 }}>
                  <input value={opt} onChange={(e) => {
                    const next = Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options.slice() : [];
                    next[j] = e.target.value;
                    updateQuestion(idx, { options: next } as Partial<Question>);
                  }} style={{ flex: 1, padding: 10, borderRadius: 10, border: "1px solid #d1d5db" }} />
                  <button onClick={() => {
                    const next = Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options.slice() : [];
                    next.splice(j, 1);
                    updateQuestion(idx, { options: next } as Partial<Question>);
                  }} style={{ border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>Remover</button>
                </div>
              ))}
              <div>
                <button title="Adicionar opção" onClick={() => {
                  const next = Array.isArray((q as unknown as { options?: string[] }).options) ? (q as unknown as { options: string[] }).options.slice() : [];
                  next.push(`Opção ${next.length + 1}`);
                  updateQuestion(idx, { options: next } as Partial<Question>);
                }} style={{ border: "1px solid #d1d5db", background: "#fff", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}>+ Adicionar opção</button>
              </div>
            </div>
          </div>
        )}
        <div style={{ marginTop: 12, fontSize: 12, color: "#667085" }}>
          {q.type === "text" && <input disabled placeholder="Exemplo" style={{ width: 240, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }} />}
          {q.type === "textarea" && <textarea disabled placeholder="Exemplo" rows={3} style={{ width: 240, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }} />}
          {q.type === "select" && <select disabled style={{ width: 240, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}><option>Opção 1</option><option>Opção 2</option></select>}
          {q.type === "radio" && <div style={{ display: "grid", gap: 6 }}><label><input disabled type="radio" /> Opção 1</label><label><input disabled type="radio" /> Opção 2</label></div>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0 }}>Nova Survey</h1>
        <a href="/admin/surveys" style={{ fontSize: 12, color: "#2563eb", textDecoration: "none" }}>Voltar</a>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: preview ? "1fr 1fr" : "1fr", gap: 16, alignItems: "start", marginTop: 16 }}>
        <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Site ID</label>
              <input title="Use seu domínio" placeholder="ex: meusite.com" value={siteId} onChange={(e) => setSiteId(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: `1px solid ${issues.some((i) => i.path === "siteId") ? "#ef4444" : "#d1d5db"}` }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Título</label>
              <input title="Nome visível da pesquisa" placeholder="ex: Pesquisa de satisfação" value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", boxSizing: "border-box", padding: 12, borderRadius: 10, border: `1px solid ${issues.some((i) => i.path === "title") ? "#ef4444" : "#d1d5db"}` }} />
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#3f3f46", marginBottom: 6 }}>Adicionar pergunta</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                {(["text", "textarea", "select", "radio"] as QType[]).map((t) => (
                  <button key={t} title={t} onClick={() => addQuestion(t)} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>{t}</button>
                ))}
              </div>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {questions.map((q, idx) => renderQuestion(q, idx))}
            </div>
            {error && <div style={{ color: "#b91c1c", fontSize: 12, whiteSpace: "pre-wrap" }}>{error}</div>}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <button onClick={() => setPreview((p) => !p)} style={{ padding: "10px 16px", borderRadius: 10, border: "1px solid #d1d5db", background: "#fff", cursor: "pointer" }}>{preview ? "Ocultar Preview" : "Visualizar"}</button>
              <button onClick={save} style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#111", color: "#fff", cursor: "pointer" }}>Salvar</button>
            </div>
          </div>
        </div>
        {preview && (
          <div>
            <div style={{ background: "#fff", border: "1px solid #eee", borderRadius: 12, padding: 16, boxShadow: "0 6px 18px rgba(0,0,0,0.05)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ fontWeight: 700 }}>{title || "Preview"}</div>
                  <div style={{ width: 160, height: 6, background: "#eef2ff", borderRadius: 999 }}>
                    <div style={{ width: `${Math.min(100, (questions.length ? (1 / questions.length) : 0) * 100)}%`, height: 6, background: "#6366f1", borderRadius: 999 }} />
                  </div>
                </div>
                <div style={{ fontSize: 12, color: "#667085" }}>{siteId}</div>
              </div>
              <div style={{ marginTop: 10, display: "grid", gap: 12 }}>
                {questions.map((q) => (
                  <div key={q.id}>
                    <div style={{ fontSize: 13, marginBottom: 6 }}>{q.prompt || "Pergunta"}</div>
                    {q.type === "text" && <input placeholder="Sua resposta" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />}
                    {q.type === "textarea" && <textarea rows={3} placeholder="Sua resposta" style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }} />}
                    {q.type === "select" && (
                      <select style={{ width: "100%", padding: 10, borderRadius: 10, border: "1px solid #e5e7eb" }}>
                        {(q as unknown as { options?: string[] }).options?.map((o: string, i: number) => (<option key={i}>{o}</option>))}
                      </select>
                    )}
                    {q.type === "radio" && (
                      <div style={{ display: "grid", gap: 8 }}>
                        {(q as unknown as { options?: string[] }).options?.map((o: string, i: number) => (<label key={i}><input type="radio" name={q.id} /> {o}</label>))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button disabled style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #e5e7eb", background: "#fff", color: "#667085" }}>Próxima ▷</button>
              </div>
            </div>
            <div style={{ marginTop: 12 }}>
              <EmbedSnippet label="HTML" code={`<script src="${origin}/api/embed?siteId=${siteId || "SEU_SITE"}&surveyId=ID_DA_SURVEY" async></script>`} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type EmbedSnippetProps = { label?: string; code: string };
function EmbedSnippet({ label = "HTML", code }: EmbedSnippetProps) {
  const copy = async () => { try { await navigator.clipboard.writeText(code); } catch { /* noop */ } };
  return (
    <div style={{ background: "#0f172a", color: "#e5e7eb", borderRadius: 10, overflow: "hidden", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)", border: "1px solid #0b1220" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #0b1220" }}>
        <span style={{ fontSize: 12, color: "#cbd5e1" }}>{label}</span>
        <button onClick={copy} style={{ border: 0, background: "#334155", color: "#e5e7eb", fontSize: 12, padding: "6px 10px", borderRadius: 8, cursor: "pointer", transition: "opacity 150ms ease, transform 100ms ease" }} onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")} onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")} onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.98)")} onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}>Copiar</button>
      </div>
      <pre style={{ margin: 0, padding: 12, fontFamily: "monospace", fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{code}</pre>
    </div>
  );
}
