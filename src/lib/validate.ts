import type { Question } from "@/lib/types";

export type Issue = { path: string; message: string };

const ID_RE = /^[a-zA-Z0-9._-]{1,64}$/;
const SITE_RE = /^[a-zA-Z0-9.-]{3,128}$/;

export function validateSurveyInput(siteId: string, title: string, questions: unknown): Issue[] {
  const issues: Issue[] = [];
  const site = (siteId || "").trim();
  const ttl = (title || "").trim();
  if (!site) issues.push({ path: "siteId", message: "Site ID é obrigatório." });
  else if (!SITE_RE.test(site)) issues.push({ path: "siteId", message: "Site ID inválido. Use letras, números, ponto e hífen (3–128)." });

  if (!ttl) issues.push({ path: "title", message: "Título é obrigatório." });
  else if (ttl.length > 255) issues.push({ path: "title", message: "Título muito longo (máx. 255)." });

  if (!Array.isArray(questions)) {
    issues.push({ path: "questions", message: "Questions deve ser um array." });
    return issues;
  }

  if (questions.length === 0) issues.push({ path: "questions", message: "Inclua ao menos uma pergunta." });
  if (questions.length > 50) issues.push({ path: "questions", message: "Máximo de 50 perguntas por survey." });

  const ids = new Set<string>();
  questions.forEach((q, idx) => {
    const path = `questions[${idx}]`;
    const qq = q as Question;
    if (!qq || typeof qq !== "object") {
      issues.push({ path, message: "Pergunta inválida." });
      return;
    }
    const id = (qq.id || "").trim();
    if (!id) issues.push({ path: `${path}.id`, message: "id é obrigatório." });
    else if (!ID_RE.test(id)) issues.push({ path: `${path}.id`, message: "id inválido (use letras, números, ., _, - até 64)." });
    else if (ids.has(id)) issues.push({ path: `${path}.id`, message: "id duplicado." });
    else ids.add(id);

    const type = qq.type as string;
    if (!type) issues.push({ path: `${path}.type`, message: "type é obrigatório." });
    else if (!["text", "textarea", "select", "radio"].includes(type)) issues.push({ path: `${path}.type`, message: "type inválido (text, textarea, select, radio)." });

    const prompt = (qq.prompt || "").trim();
    if (!prompt) issues.push({ path: `${path}.prompt`, message: "prompt é obrigatório." });
    else if (prompt.length > 255) issues.push({ path: `${path}.prompt`, message: "prompt muito longo (máx. 255)." });

    const needsOptions = type === "select" || type === "radio";
    const hasOptions = Array.isArray((qq as unknown as { options?: unknown[] }).options);
    if (needsOptions && !hasOptions) issues.push({ path: `${path}.options`, message: "options é obrigatório para select/radio." });
    if (hasOptions) {
      const opts = (qq as unknown as { options: unknown[] }).options;
      if (opts.length === 0) issues.push({ path: `${path}.options`, message: "options não pode ser vazio." });
      if (opts.length > 50) issues.push({ path: `${path}.options`, message: "options com muitos itens (máx. 50)." });
      opts.forEach((o, j) => {
        if (typeof o !== "string" || !o.trim()) issues.push({ path: `${path}.options[${j}]`, message: "option deve ser string não vazia." });
        else if (o.length > 100) issues.push({ path: `${path}.options[${j}]`, message: "option muito longa (máx. 100)." });
      });
    }
  });

  return issues;
}
