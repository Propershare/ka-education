/**
 * Ka Education — standalone Express server
 *
 * Serves the Vite-built frontend from dist/public/ and proxies three API routes
 * to the Ka Education Fastify backend with server-side Bearer auth.
 *
 * Required env vars:
 *   KA_EDU_API_BASE  — backend URL, e.g. http://127.0.0.1:3007
 *   KA_EDU_JWT       — read-only service token (never sent to the browser)
 *
 * Optional:
 *   PORT             — TCP port to listen on (default: 3008)
 */
import express, { type Request, type Response } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";

// ─── ESM __dirname shim ───────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

// ─── Config (read once at startup) ───────────────────────────────────────────
const PORT             = parseInt(process.env.PORT ?? "3008", 10);
const KA_EDU_API_BASE  = process.env.KA_EDU_API_BASE ?? "";
const KA_EDU_JWT       = process.env.KA_EDU_JWT      ?? "";

/** Directory where `vite build` writes the SPA. */
const STATIC_DIR = path.join(__dirname, "public");

// ─── Backend helpers ──────────────────────────────────────────────────────────

type BackendOk    = { ok: true;  apiBase: string; jwt: string };
type BackendError = { ok: false; error: "BACKEND_UNREACHABLE" | "BACKEND_AUTH_MISSING" };

function backendConfig(): BackendOk | BackendError {
  if (!KA_EDU_API_BASE) return { ok: false, error: "BACKEND_UNREACHABLE"  };
  if (!KA_EDU_JWT)      return { ok: false, error: "BACKEND_AUTH_MISSING" };
  return { ok: true, apiBase: KA_EDU_API_BASE, jwt: KA_EDU_JWT };
}

/** Strip all email variants before any result reaches the browser. */
function stripEmail(obj: Record<string, unknown>): Record<string, unknown> {
  const c = { ...obj };
  delete c.email;
  delete c.emailAddress;
  delete c.email_address;
  return c;
}

/** Authenticated fetch to the Ka Education backend with 8-second timeout. */
async function backendFetch(url: string, jwt: string): Promise<unknown> {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), 8_000);
  try {
    const r = await fetch(url, {
      signal: ctrl.signal,
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(tid);
  }
}

// ─── Ask-Scholar keyword router ───────────────────────────────────────────────

const STOPWORDS = new Set([
  "what","are","is","the","a","an","in","of","and","to","do",
  "there","any","me","show","list","find","get","how","many",
  "all","some","this","that","with","for","from","by",
]);

function tokenize(q: string): string[] {
  return q.toLowerCase().trim()
    .split(/\s+/)
    .map(t => t.replace(/[^a-z0-9]/g, ""))
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

// ─── Express app ──────────────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── GET /api/projects/search ──────────────────────────────────────────────────
app.get("/api/projects/search", async (req: Request, res: Response) => {
  const cfg = backendConfig();
  if (!cfg.ok) { res.status(502).json({ error: cfg.error }); return; }

  const p = new URLSearchParams();
  if (req.query.q)      p.set("q",      String(req.query.q));
  if (req.query.limit)  p.set("limit",  String(req.query.limit));
  if (req.query.status) p.set("status", String(req.query.status));

  try {
    const data = await backendFetch(`${cfg.apiBase}/projects/search?${p}`, cfg.jwt);
    res.json(data);
  } catch (e) {
    console.error("[/api/projects/search]", e);
    res.status(502).json({ error: "BACKEND_UNREACHABLE", message: `cannot reach ${cfg.apiBase}` });
  }
});

// ── GET /api/handles/search ───────────────────────────────────────────────────
// Strips email, emailAddress, email_address from every result before responding.
app.get("/api/handles/search", async (req: Request, res: Response) => {
  const cfg = backendConfig();
  if (!cfg.ok) { res.status(502).json({ error: cfg.error }); return; }

  const p = new URLSearchParams();
  if (req.query.q)       p.set("q",       String(req.query.q));
  if (req.query.limit)   p.set("limit",   String(req.query.limit));
  if (req.query.variant) p.set("variant",  String(req.query.variant));

  try {
    const raw = await backendFetch(`${cfg.apiBase}/handles/search?${p}`, cfg.jwt) as {
      query: string; variant: string; count: number; results: Record<string, unknown>[];
    };
    res.json({ ...raw, results: (raw.results ?? []).map(stripEmail) });
  } catch (e) {
    console.error("[/api/handles/search]", e);
    res.status(502).json({ error: "BACKEND_UNREACHABLE", message: `cannot reach ${cfg.apiBase}` });
  }
});

// ── POST /api/ask-scholar ─────────────────────────────────────────────────────
app.post("/api/ask-scholar", async (req: Request, res: Response) => {
  const { question } = req.body as { question?: string };

  if (!question?.trim()) {
    res.status(400).json({ error: "BAD_REQUEST", message: "question is required and must not be empty" });
    return;
  }

  const cfg = backendConfig();
  if (!cfg.ok) {
    res.status(502).json({
      error: cfg.error,
      message: cfg.error === "BACKEND_AUTH_MISSING"
        ? "KA_EDU_JWT is not configured"
        : "KA_EDU_API_BASE is not configured",
    });
    return;
  }

  const tokens    = tokenize(question);
  const isProject = tokens.some(t => ["project","institution","nomes","nome"].includes(t));
  const isUser    = tokens.some(t => ["user","operator","admin"].includes(t));
  const isLearner = tokens.some(t => ["learner","student"].includes(t));
  const isDefault = !isProject && !isUser && !isLearner;
  const q         = encodeURIComponent(question);

  type AnyRow = Record<string, unknown>;
  const projects: AnyRow[] = [];
  const handles:  AnyRow[] = [];

  try {
    const work: Promise<void>[] = [];

    if (isProject || isDefault) work.push(
      backendFetch(`${cfg.apiBase}/projects/search?q=${q}&limit=10`, cfg.jwt)
        .then(d => projects.push(...((d as { results?: AnyRow[] }).results ?? [])))
    );

    if (isUser || isDefault) work.push(
      backendFetch(`${cfg.apiBase}/handles/search?q=${q}&limit=10&variant=user`, cfg.jwt)
        .then(d => handles.push(...((d as { results?: AnyRow[] }).results ?? []).map(stripEmail)))
    );

    if (isLearner) work.push(
      backendFetch(`${cfg.apiBase}/handles/search?q=${q}&limit=10&variant=learner`, cfg.jwt)
        .then(d => handles.push(...((d as { results?: AnyRow[] }).results ?? []).map(stripEmail)))
    );

    await Promise.all(work);
    res.json({ question, projects, handles });
  } catch (e) {
    console.error("[/api/ask-scholar]", e);
    res.status(502).json({ error: "BACKEND_UNREACHABLE", message: `cannot reach ${cfg.apiBase}` });
  }
});

// ── Static frontend + SPA fallback ────────────────────────────────────────────
// Must come AFTER the /api/* routes so API paths are not intercepted.
app.use(express.static(STATIC_DIR));
app.use((_req: Request, res: Response) => {
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Ka Education listening on port ${PORT}`);
  if (KA_EDU_API_BASE) {
    console.log(`Backend : ${KA_EDU_API_BASE}`);
    console.log(`JWT set : ${KA_EDU_JWT ? "yes" : "NO — live sections will return BACKEND_AUTH_MISSING"}`);
  } else {
    console.warn("KA_EDU_API_BASE not set — live sections will return BACKEND_UNREACHABLE");
  }
});
