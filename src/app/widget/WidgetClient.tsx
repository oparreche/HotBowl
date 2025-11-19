"use client";
import { useEffect, useMemo, useState } from "react";
import type { Survey } from "@/lib/types";

type Props = { survey: Survey; siteId: string; surveyId: string };

export default function WidgetClient({ survey, siteId, surveyId }: Props) {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const q = survey.questions[step];
  const total = survey.questions.length;
  const progress = Math.round(((step + 1) / total) * 100);
  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  useEffect(() => {
    fetch(`/api/track-view?siteId=${encodeURIComponent(siteId)}&surveyId=${encodeURIComponent(surveyId)}`, { method: "POST" }).catch(() => {});
  }, [siteId, surveyId]);

  if (!open) return (
    <div style={{ padding: 12, fontSize: 13 }}>
      <button onClick={() => setOpen(true)} style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #ddd", background: "#f7f7f7", cursor: "pointer" }}>Abrir Survey</button>
    </div>
  );

  function onChange(id: string, v: unknown) {
    setAnswers((a) => ({ ...a, [id]: v }));
  }

  async function onNext() {
    if (step < total - 1) {
      setStep((s) => s + 1);
      return;
    }
    const res = await fetch(`/api/submit?siteId=${encodeURIComponent(siteId)}&surveyId=${encodeURIComponent(surveyId)}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers }) });
    if (res.ok) setOpen(false);
  }

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", background: "#fff" }}>
      <div style={{ padding: 16, width: "100%", boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ margin: 0 }}>{survey.title}</h2>
            <div style={{ width: "100%", height: 4, background: "#eef2f7", borderRadius: 8, marginTop: 8 }}>
              <div style={{ width: `${progress}%`, height: 4, background: "#3b82f6", borderRadius: 8 }} />
            </div>
          </div>
          <button onClick={() => setOpen(false)} aria-label="Fechar" title="Fechar" style={{ border: 0, background: "transparent", cursor: "pointer", fontSize: 18 }}>×</button>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={{ display: "block", marginBottom: 6 }}>{q.prompt}</label>
          {q.type === "text" && (
            <input onChange={(e) => onChange(q.id, e.target.value)} type="text" style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
          )}
          {q.type === "textarea" && (
            <textarea onChange={(e) => onChange(q.id, e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }} />
          )}
          {q.type === "select" && (
            <select onChange={(e) => onChange(q.id, e.target.value)} style={{ width: "100%", padding: 8, borderRadius: 8, border: "1px solid #ddd" }}>
              {(q.options || []).map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          {q.type === "radio" && (
            <div>
              {(q.options || []).map((opt) => (
                <label key={opt} style={{ display: "block" }}>
                  <input type="radio" name={q.id} value={opt} onChange={(e) => onChange(q.id, e.target.value)} /> {opt}
                </label>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 16 }}>
          <div style={{ fontSize: 12, color: "#888" }}>Pergunta {step + 1} de {total}</div>
          <button onClick={onNext} style={{ padding: "10px 16px", borderRadius: 8, border: 0, background: "#111", color: "#fff", cursor: "pointer" }}>{step < total - 1 ? "Próxima" : "Enviar"}</button>
        </div>
        <div style={{ marginTop: 12 }}>
          <a href={`${origin}`} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#888" }}>HotBowl</a>
        </div>
      </div>
    </div>
  );
}
