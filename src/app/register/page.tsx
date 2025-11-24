"use client";
import { useState } from "react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, name, password }) });
      const ok = res.ok && res.headers.get("content-type")?.includes("application/json");
      const data = ok ? await res.json() : null;
      if (!res.ok) {
        setError((data && (data.message as string)) || "Falha no cadastro.");
        return;
      }
      window.location.href = "/login";
    } catch {
      setError("Falha no cadastro.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc" }}>
      <div style={{ width: 360, background: "#fff", border: "1px solid #eee", borderRadius: 16, padding: 20, boxShadow: "0 12px 24px rgba(0,0,0,0.06)" }}>
        <h1 style={{ margin: 0, fontSize: 20 }}>Cadastrar</h1>
        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#667085", marginBottom: 6 }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#667085", marginBottom: 6 }}>Nome</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, color: "#667085", marginBottom: 6 }}>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #d1d5db" }} />
          </div>
          {error && <div style={{ fontSize: 12, color: "#b91c1c" }}>{error}</div>}
          <button onClick={onSubmit} disabled={loading} style={{ padding: "10px 16px", borderRadius: 10, border: 0, background: "#111", color: "#fff", cursor: loading ? "not-allowed" : "pointer" }}>{loading ? "Cadastrando..." : "Cadastrar"}</button>
          <div style={{ fontSize: 12 }}>Já tem conta? <a href="/login" style={{ color: "#2563eb", textDecoration: "none" }}>Entrar</a></div>
        </div>
      </div>
    </div>
  );
}
