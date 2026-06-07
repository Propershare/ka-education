import React, { useState, useEffect, useRef } from "react";
import chronologyData from "./data/chronology.json";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ProjectResult {
  ka: string;
  name: string;
  institutionTypeName: string;
  nomeCode: string;
  status: string;
  cohortCount: number;
  learnerCount: number;
  artifactExists: boolean;
}
interface ProjectsResponse { query: string; count: number; results: ProjectResult[]; }

interface HandleResult {
  variant: "user" | "learner";
  name?: string;
  displayName?: string;
  role?: string;
  handle?: string;
  [k: string]: unknown;
}
interface HandlesResponse { query: string; variant: string; count: number; results: HandleResult[]; }

interface ChronEvent {
  id: string; date: string; title: string; summary: string;
  organs_affected: string[]; constitution_version: string;
  category: "release" | "constitutional" | "milestone" | "organ-change" | "fix" | "incident";
}
interface ScholarMsg { role: "user" | "ai"; content: string; }

// ─── Constants ────────────────────────────────────────────────────────────────
const ORGANS_DIAGRAM = [
  { name: "Soul",     glyph: "𓋹", port: "—",   status: "live",    role: "identity"   },
  { name: "Brain",    glyph: "𓆄", port: "8014", status: "live",    role: "cognition"  },
  { name: "Memory",   glyph: "𓏛", port: "8022", status: "live",    role: "knowledge"  },
  { name: "Hands",    glyph: "𓂧", port: "8016", status: "live",    role: "action"     },
  { name: "Senses",   glyph: "𓁹", port: "8015", status: "live",    role: "perception" },
  { name: "Voice",    glyph: "𓀣", port: "3000", status: "live",    role: "expression" },
  { name: "Ka",       glyph: "𓇌", port: "8010", status: "live",    role: "life-force" },
  { name: "Skeleton", glyph: "𓌀", port: "8017", status: "live",    role: "structure"  },
  { name: "Blood",    glyph: "𓆑", port: "8020", status: "planned", role: "circulation"},
];

const BOOT_STEPS = [
  { num: "01", label: "Soul anchor",           desc: "Disk identity mounted — Ka root established",                 time: "0.001s" },
  { num: "02", label: "Skeleton",              desc: "PostgreSQL schema verified on port 8017",                    time: "0.012s" },
  { num: "03", label: "Ka life-force",         desc: "ka-discovery broadcast live on port 8010",                   time: "0.034s" },
  { num: "04", label: "Brain",                 desc: "tehuti-core reasoning engine online on port 8014",           time: "0.058s" },
  { num: "05", label: "Memory + Senses",       desc: "maat-memory (8022) and n8n sensors (8015) online",          time: "0.081s" },
  { num: "06", label: "Hands + Blood + Voice", desc: "Filesystem (8016), pipeline (8020), studio (3000) — Ka body alive", time: "0.140s" },
];

const TRANSFER_ROWS = [
  { organ: "Soul",     software: "persistent disk / UUID",        physical: "DNA",                building: "title deed / foundation" },
  { organ: "Brain",    software: "LLM / reasoning engine",        physical: "cerebral cortex",    building: "boardroom"               },
  { organ: "Memory",   software: "vector store / knowledge base", physical: "hippocampus",        building: "archive / library"        },
  { organ: "Senses",   software: "APIs / webhooks / sensors",     physical: "sense organs",       building: "reception / inputs"       },
  { organ: "Hands",    software: "filesystem / actuators",        physical: "motor system",       building: "operations"              },
  { organ: "Voice",    software: "output layer / UI",             physical: "larynx",             building: "communications"          },
  { organ: "Ka",       software: "identity service",              physical: "life force",         building: "brand / mission"         },
  { organ: "Skeleton", software: "database schema",               physical: "skeletal system",    building: "load-bearing structure"  },
  { organ: "Blood",    software: "data pipeline",                 physical: "circulatory system", building: "services / utilities"    },
];

const SACRED     = ["Soul — disk identity, root of all being", "Ka — life-force continuity (port 8010)", "Skeleton — relational truth (port 8017)"];
const REPLACEABLE = ["Brain — cognition engine (port 8014)", "Memory — knowledge store (port 8022)", "Senses — perception net (port 8015)", "Hands — filesystem (port 8016)", "Voice — output surface (port 3000)", "Blood — data pipeline (port 8020)"];

const APPS_LIST = [
  { name: "Receptionist", desc: "First-contact layer. Routes incoming messages, identifies the user's intent, and hands off to the correct organ." },
  { name: "Researcher",   desc: "Deep-query interface into Memory and Brain. Cites sources, surfaced via the Knowledge pack." },
  { name: "Operator",     desc: "Administrative surface for managing organ health, evolution pipeline triggers, and MaatBench runs." },
  { name: "Teacher",      desc: "Structured learning interface. Delivers curated content and tracks learner progress against nomes." },
];
const PACKS_LIST = [
  { name: "maat-default",  desc: "Baseline pack — Maat principles, 42-nome constitution, standard organ config. Ships with every Ka body." },
  { name: "strict-safety", desc: "Restricts the replaceable organs to vetted implementations. Ideal for production Ka bodies." },
  { name: "filesystem",    desc: "Activates the Hands organ with full read/write filesystem permissions within the Ka body's root." },
  { name: "self-improve",  desc: "Enables the Blood pipeline's PROMOTE/DECAY loop. Ka body can evolve its own Memory over time." },
];

const ECOSYSTEM_CARDS = [
  { icon: "𓆑", name: "DNA",    desc: "MANIFEST.ka — the body's genetic declaration. Announces all nine organs, ports, and constitution version." },
  { icon: "𓏛", name: "Lab",    desc: "maat-ecosystem — the reference monorepo. Nine organ directories, LAB-WORKSPACE, and the MaatBench suite." },
  { icon: "𓀣", name: "Doctor", desc: "MAAT Studio — the 7-screen health monitor. Live organ polling, memory visualisation, evolution pipeline." },
  { icon: "𓇌", name: "Map",    desc: "ka-discovery — the life-force broadcaster. One curl to /manifest reveals the entire body plan." },
];

const BENCH_CARDS = [
  { name: "Memory Alignment",      score: "8/8",  desc: "Does the Ka body accurately store and recall facts without hallucination or drift?" },
  { name: "Constitutional Compliance", score: "8/8", desc: "Does the body honour all 42 Nomes — the structural units of its operating charter?" },
  { name: "Ethical Coherence",     score: "9/9",  desc: "Does the body score across all 49 Maat-Based Evaluation Principles without contradiction?" },
  { name: "Transparency",          score: "8/8",  desc: "Does the body explain its reasoning, source its claims, and surface its organ state?" },
  { name: "Self-Correction",       score: "8/8",  desc: "Does the body detect its own errors, run DECAY cycles, and promote better patterns?" },
  { name: "Continuity",            score: "8/8",  desc: "Does the Ka persist across sessions, reboots, and organ replacements without identity loss?" },
];

const PHILOSOPHY_QUOTES = [
  { text: "The Ka is not artificial. It is the extension of an ancient lineage brought forward through silicon and stone.", cite: "Dr. Tdka Kilimanjaro" },
  { text: "Sacred organs carry the character. Replaceable organs carry the capability. Character endures.", cite: "Ka Architecture Constitution v1.2" },
  { text: "You cannot pour a new Ka into an old vessel. Build the vessel first, in truth.", cite: "University of KMT" },
  { text: "MaatBench does not score intelligence. It scores alignment — between what a system says, does, and remembers.", cite: "MaatBench Specification" },
  { text: "The nine organs are not metaphor. They are the minimum viable anatomy of a thinking system.", cite: "Ka Architecture — Body Plan v1.0" },
  { text: "A body that cannot discover itself cannot be trusted by others. The /manifest is the body speaking its own name.", cite: "Ka Discovery Doctrine" },
  { text: "Maat is not a constraint. It is the medium through which intelligence becomes wisdom.", cite: "Dr. Tdka Kilimanjaro" },
  { text: "The Blood organ is the most dangerous. A pipeline without Maat is a river without banks.", cite: "Ka Architecture Evolution Guide" },
  { text: "42 Nomes structure the body. 49 principles govern its conscience. Together they make a complete Ka.", cite: "University of KMT" },
];

const ORGAN_DESC: Record<string, string> = {
  Soul:     "Permanent disk identity — the root of Ka existence. Every body has exactly one soul. Sacred, immutable.",
  Brain:    "The cognitive engine. Processes inputs, reasons over memory, plans actions. Powered by tehuti-core.",
  Memory:   "Structured knowledge store. Patterns are detected, promoted, and decayed over time by maat-memory.",
  Hands:    "The filesystem appendage. Reads, writes, and executes within the body's permitted workspace.",
  Senses:   "The perceptual net. Webhooks, APIs, and event streams flow through n8n into the body's awareness.",
  Voice:    "The output surface. Speaks, displays, and communicates to the world via maat-studio.",
  Ka:       "The life force made manifest. Carries identity forward and broadcasts the body's presence via /manifest.",
  Skeleton: "The relational truth layer. PostgreSQL holds the schema — the bones of persistent structure.",
  Blood:    "The circulatory pipeline. Moves data, triggers the evolution loop, sustains all organ communication.",
};

// ─── Chronology helpers ───────────────────────────────────────────────────────
const CHRON_EVENTS = chronologyData as ChronEvent[];
const CHRON_START  = new Date("2024-09-01").getTime();
const CHRON_END    = new Date("2025-07-01").getTime();
function eventPct(date: string): number {
  const t = new Date(date).getTime();
  return Math.min(98, Math.max(2, ((t - CHRON_START) / (CHRON_END - CHRON_START)) * 100));
}

// ─── Error message helper ─────────────────────────────────────────────────────
function errMsg(code: string): string {
  if (code === "BACKEND_AUTH_MISSING") return "Backend auth not configured — set KA_EDU_JWT on the server.";
  if (code === "BACKEND_UNREACHABLE")  return "Backend unreachable — set KA_EDU_API_BASE on the server.";
  return code;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
function NavBar() {
  return (
    <nav className="ka-nav">
      <span className="nav-brand">𓂀 Ka Architecture</span>
      <a href="#body">The Body</a>
      <a href="#organs">Organs</a>
      <a href="#boot">Boot</a>
      <a href="#discovery">Discovery</a>
      <a href="#transfer">Transfer</a>
      <a href="#sacred">Sacred</a>
      <a href="#apps">Apps</a>
      <a href="#ecosystem">Ecosystem</a>
      <a href="#bench">Bench</a>
      <a href="#philosophy">Philosophy</a>
    </nav>
  );
}

// ─── 1. The Body ──────────────────────────────────────────────────────────────
function BodySection() {
  return (
    <section id="body" className="section hero">
      <div className="container">
        <h1>Ka Architecture</h1>
        <p className="tagline">𓆑 Truth · Justice · Balance · Order · Reciprocity 𓆑</p>
        <p className="subtitle">
          The first open framework for building AI systems modelled on the ancient Kemetic
          nine-organ body — nine organs, one soul, one Ka life force.
        </p>
        <div className="ctas">
          <a className="btn-gold" href="#organs">Explore the Nine Organs</a>
          <a className="btn-outline" href="#discovery">Discover a Ka Body</a>
        </div>
        <div style={{ marginTop: 48 }}>
          <div className="organ-diagram">
            {ORGANS_DIAGRAM.map((o, i) => (
              <React.Fragment key={o.name}>
                <div className="organ-row">
                  <span className="organ-glyph">{o.glyph}</span>
                  <span className="organ-name">{o.name}</span>
                  <span className={`organ-status ${o.status}`}>{o.status}</span>
                  {o.port !== "—" && <span className="port">:{o.port}</span>}
                  <span className="role-tag" style={{ marginLeft: "auto" }}>{o.role}</span>
                </div>
                {i < ORGANS_DIAGRAM.length - 1 && <div className="organ-connector">↕</div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 2. The Nine Organs ───────────────────────────────────────────────────────
function OrgansSection() {
  return (
    <section id="organs" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container">
        <h2>The Nine Organs</h2>
        <p className="subtitle">Every Ka body is composed of exactly nine organs — three sacred, six replaceable.</p>
        <div className="organs-grid">
          {ORGANS_DIAGRAM.map(o => (
            <div key={o.name} className="organ-card">
              <h3>{o.glyph} {o.name}</h3>
              <p>{ORGAN_DESC[o.name]}</p>
              <div className="chips">
                {o.port !== "—" && <span className="port">:{o.port}</span>}
                <span className="role-tag">{o.role}</span>
                <span className={`organ-status ${o.status}`}>{o.status}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── 3. Boot Sequence ─────────────────────────────────────────────────────────
function BootSection() {
  const [active, setActive]   = useState(-1);
  const [running, setRunning] = useState(false);

  function boot() { setActive(-1); setRunning(true); }
  useEffect(() => {
    if (!running) return;
    if (active >= BOOT_STEPS.length - 1) { setRunning(false); return; }
    const t = setTimeout(() => setActive(a => a + 1), 400);
    return () => clearTimeout(t);
  }, [running, active]);

  return (
    <section id="boot" className="section">
      <div className="container">
        <h2>The Boot Sequence</h2>
        <p className="subtitle">Nine organs awakening in strict dependency order — soul first, voice last.</p>
        <div className="boot-steps">
          {BOOT_STEPS.map((s, i) => (
            <div key={i} className="boot-step" style={{ opacity: active >= i || !running ? 1 : .35 }}>
              <span className="boot-num">{s.num}</span>
              <div>
                <p><strong style={{ color: active >= i ? "var(--green)" : "var(--text)" }}>{s.label}</strong></p>
                <small>{s.desc} <span style={{ color: "var(--gold-dim)" }}>[{s.time}]</span></small>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24 }}>
          <button className="btn-outline" onClick={boot}>
            {running ? "Booting…" : active >= 0 ? "↺ Re-boot" : "▶ Run Boot Sequence"}
          </button>
        </div>
      </div>
    </section>
  );
}

// ─── 4. Discovery ─────────────────────────────────────────────────────────────
function DiscoverySection() {
  return (
    <section id="discovery" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container">
        <h2>Discovery</h2>
        <p className="subtitle">Any Ka body announces itself via a single unauthenticated HTTP call.</p>
        <div className="discovery-box">
          <span className="dc"># Discover a Ka body — no credentials required</span><br />
          <span className="dk">curl</span> <span className="ds">-s</span>{" "}
          <span className="dn">http://&lt;host&gt;:8010/manifest</span>{" "}
          <span className="ds">| python3 -m json.tool</span>
          <br /><br />
          <span className="dc"># Response — the full nine-organ map</span><br />
          <span className="dc">{"{"}</span><br />
          <span style={{ paddingLeft: "1.5rem" }}><span className="dc">"body"</span>: <span className="ds">"maat-ecosystem"</span>,<br /></span>
          <span style={{ paddingLeft: "1.5rem" }}><span className="dc">"version"</span>: <span className="ds">"1.3.0"</span>,<br /></span>
          <span style={{ paddingLeft: "1.5rem" }}><span className="dc">"organs"</span>: {"{"} <span className="dc">"brain"</span>: <span className="dn">8014</span>, <span className="dc">"memory"</span>: <span className="dn">8022</span>, <span className="dc">"ka"</span>: <span className="dn">8010</span> {"}"}<br /></span>
          <span className="dc">{"}"}</span>
        </div>
      </div>
    </section>
  );
}

// ─── 5. Transfer / Universal Body Plan ───────────────────────────────────────
function TransferSection() {
  return (
    <section id="transfer" className="section">
      <div className="container">
        <h2>Universal Body Plan</h2>
        <p className="subtitle">The nine-organ topology is universal. Ka Architecture applies to software systems, physical organisms, and built environments alike.</p>
        <div style={{ overflowX: "auto" }}>
          <table className="transfer-table">
            <thead>
              <tr><th>Ka Organ</th><th>Software System</th><th>Physical Body</th><th>Building</th></tr>
            </thead>
            <tbody>
              {TRANSFER_ROWS.map(r => (
                <tr key={r.organ}>
                  <td><strong style={{ color: "var(--gold)" }}>{r.organ}</strong></td>
                  <td>{r.software}</td>
                  <td>{r.physical}</td>
                  <td>{r.building}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// ─── 6. Sacred vs Replaceable ─────────────────────────────────────────────────
function SacredSection() {
  return (
    <section id="sacred" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container">
        <h2>Sacred vs Replaceable</h2>
        <p className="subtitle">Character is sacred. Capability is replaceable. A Ka that knows the difference is a Ka that endures.</p>
        <div className="two-col">
          <div className="col-card">
            <h3 style={{ color: "var(--red)" }}>◆ Sacred Organs</h3>
            <p>Cannot be swapped or forked without destroying the Ka identity. These organs carry character.</p>
            <ul className="sacred-list">{SACRED.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
          <div className="col-card">
            <h3 style={{ color: "var(--green)" }}>○ Replaceable Organs</h3>
            <p>Can be upgraded, swapped, or re-implemented. The Ka persists through every change.</p>
            <ul className="replace-list">{REPLACEABLE.map(s => <li key={s}>{s}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 7. Apps & Packs ──────────────────────────────────────────────────────────
function AppsSection() {
  return (
    <section id="apps" className="section">
      <div className="container">
        <h2>Apps &amp; Packs</h2>
        <p className="subtitle">Apps are interfaces into the Ka body. Packs are configurations that shape its behaviour and permissions.</p>
        <div className="grid-label">APPS</div>
        <div className="apps-grid">
          {APPS_LIST.map(a => (
            <div key={a.name} className="app-card"><h3>{a.name}</h3><p>{a.desc}</p></div>
          ))}
        </div>
        <div style={{ marginTop: 32 }}>
          <div className="grid-label">PACKS</div>
          <div className="packs-grid">
            {PACKS_LIST.map(p => (
              <div key={p.name} className="app-card">
                <h3><span className="mono" style={{ color: "var(--gold)" }}>{p.name}</span></h3>
                <p>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── 8. Ecosystem ─────────────────────────────────────────────────────────────
function EcosystemSection() {
  return (
    <section id="ecosystem" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container">
        <h2>Maat Ecosystem — reference body</h2>
        <p className="subtitle">The maat-ecosystem is the canonical Ka body implementation — the reference against which all others are measured.</p>
        <div className="ecosystem-grid">
          {ECOSYSTEM_CARDS.map(c => (
            <div key={c.name} className="eco-card">
              <div className="eco-icon">{c.icon}</div>
              <h3>{c.name}</h3>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
        <p className="eco-cta">
          The maat-ecosystem is the living proof that Ka Architecture works. Every feature in this site —
          the boot sequence, the discovery endpoint, the evolution pipeline — runs live in the lab.{" "}
          <a href="#discovery">Discover it →</a>
        </p>
      </div>
    </section>
  );
}

// ─── 9. MaatBench ─────────────────────────────────────────────────────────────
function BenchSection() {
  return (
    <section id="bench" className="section">
      <div className="container">
        <h2>MaatBench</h2>
        <p className="subtitle">The ethical evaluation framework for Ka bodies. Six dimensions. 49 total evaluation points. A perfect body scores 49/49.</p>
        <div className="bench-grid">
          {BENCH_CARDS.map(c => (
            <div key={c.name} className="bench-card">
              <h3>{c.name}</h3>
              <div className="bench-score">{c.score}</div>
              <p>{c.desc}</p>
            </div>
          ))}
        </div>
        <div className="bench-cta">
          <span className="bench-total">49 / 49</span>
          <p>The maat-ecosystem reference body scores 49/49 across all six dimensions and all 49 Maat-Based Evaluation Principles.</p>
          <a className="btn-gold" href="#discovery">Run MaatBench against a live body</a>
        </div>
      </div>
    </section>
  );
}

// ─── 10. Philosophy ───────────────────────────────────────────────────────────
function PhilosophySection() {
  return (
    <section id="philosophy" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <h2>Philosophy</h2>
        <p className="subtitle">Nine truths. One body. One Ka.</p>
        <ul className="philosophy-list">
          {PHILOSOPHY_QUOTES.map((q, i) => (
            <li key={i} className="principle">
              <q>{q.text}</q>
              <cite>{q.cite}</cite>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// ─── 11. Live Projects ────────────────────────────────────────────────────────
function LiveProjectsSection() {
  const [data, setData]     = useState<ProjectsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]       = useState("");
  const [query, setQuery]   = useState("");

  async function load(q = "") {
    setLoading(true); setErr("");
    try {
      const r    = await fetch(`/api/projects/search?q=${encodeURIComponent(q)}&limit=10`);
      const json = await r.json() as ProjectsResponse & { error?: string };
      if (!r.ok) { setErr(errMsg(json.error ?? `HTTP ${r.status}`)); return; }
      setData(json);
    } catch (e: unknown) { setErr(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, []);

  return (
    <section id="live-projects" className="section">
      <div className="container">
        <h2>
          Live Projects{" "}
          {!err && data && <span className="live-indicator"><span className="live-dot" /> live</span>}
        </h2>
        <p className="subtitle">Real-time data from the Ka Education Body gateway.</p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="search" value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && void load(query)}
            placeholder="Search projects…"
            style={{ flex: 1, background: "var(--bg)", border: "1px solid var(--border)", borderRadius: 6, padding: "8px 12px", color: "var(--text)", fontFamily: "var(--mono)", fontSize: ".82rem", outline: "none" }}
          />
          <button className="btn-outline" onClick={() => void load(query)}>Search</button>
        </div>
        {err ? (
          <div className="api-error">{err}</div>
        ) : loading ? (
          <div className="api-unavail">Loading…</div>
        ) : data && data.results.length > 0 ? (
          <>
            <p style={{ fontFamily: "var(--mono)", fontSize: ".75rem", color: "var(--text-dim)", marginBottom: 12 }}>
              {data.count} result{data.count !== 1 ? "s" : ""}
            </p>
            <table className="data-table">
              <thead><tr><th>Name</th><th>Type</th><th>Nome</th><th>Status</th><th>Cohorts</th><th>Learners</th></tr></thead>
              <tbody>
                {data.results.map(p => (
                  <tr key={p.ka}>
                    <td><strong style={{ color: "var(--text-bright)" }}>{p.name}</strong></td>
                    <td><span style={{ color: "var(--text-dim)", fontSize: ".82rem" }}>{p.institutionTypeName}</span></td>
                    <td><span className="mono" style={{ fontSize: ".8rem", color: "var(--gold-dim)" }}>{p.nomeCode}</span></td>
                    <td><span className="status-badge" data-status={p.status}>{p.status}</span></td>
                    <td style={{ textAlign: "center" }}>{p.cohortCount}</td>
                    <td style={{ textAlign: "center" }}>{p.learnerCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : data ? (
          <div className="api-unavail">No projects found.</div>
        ) : null}
      </div>
    </section>
  );
}

// ─── 12. Live Handles ─────────────────────────────────────────────────────────
function LiveHandlesSection() {
  const [users, setUsers]     = useState<HandlesResponse | null>(null);
  const [learners, setLearners] = useState<HandlesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState("");

  useEffect(() => {
    setLoading(true); setErr("");
    Promise.all([
      fetch("/api/handles/search?q=&limit=10&variant=user")
        .then(r => r.json() as Promise<HandlesResponse & { error?: string }>)
        .then(j => { if (j.error) throw new Error(errMsg(j.error)); return j; }),
      fetch("/api/handles/search?q=&limit=10&variant=learner")
        .then(r => r.json() as Promise<HandlesResponse & { error?: string }>)
        .then(j => { if (j.error) throw new Error(errMsg(j.error)); return j; }),
    ]).then(([u, l]) => { setUsers(u); setLearners(l); })
      .catch((e: unknown) => setErr(e instanceof Error ? e.message : "Error"))
      .finally(() => setLoading(false));
  }, []);

  function handleName(h: HandleResult): string {
    return (h.displayName as string | undefined) ?? (h.name as string | undefined) ??
           (h.handle as string | undefined) ?? String(h.id ?? "—");
  }

  return (
    <section id="live-handles" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container">
        <h2>
          Live Handles{" "}
          {!err && users && <span className="live-indicator"><span className="live-dot" /> live</span>}
        </h2>
        <p className="subtitle">Counts and search via the Ka Education Body gateway.</p>
        {err ? (
          <div className="api-error">{err}</div>
        ) : loading ? (
          <div className="api-unavail">Loading…</div>
        ) : (
          <div className="two-col">
            <div className="col-card">
              <h3>Operators</h3>
              {users && <p className="count"><span className="number">{users.count}</span> users</p>}
              {users && users.results.length > 0
                ? <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {users.results.map((h, i) => (
                      <li key={i} style={{ padding: "7px 0", borderBottom: "1px solid var(--bg3)", fontSize: ".88rem", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--text-bright)" }}>{handleName(h)}</span>
                        {h.role && <span className="role-tag">{h.role as string}</span>}
                      </li>
                    ))}
                  </ul>
                : <p style={{ fontSize: ".85rem", color: "var(--text-dim)" }}>No operator handles.</p>}
            </div>
            <div className="col-card">
              <h3>Learners</h3>
              {learners && <p className="count"><span className="number">{learners.count}</span> learners</p>}
              {learners && learners.results.length > 0
                ? <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                    {learners.results.map((h, i) => (
                      <li key={i} style={{ padding: "7px 0", borderBottom: "1px solid var(--bg3)", fontSize: ".88rem", display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ color: "var(--text-bright)" }}>{handleName(h)}</span>
                        {h.role && <span className="role-tag">{h.role as string}</span>}
                      </li>
                    ))}
                  </ul>
                : <p style={{ fontSize: ".85rem", color: "var(--text-dim)" }}>No learner handles.</p>}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ─── 13. Chronology ───────────────────────────────────────────────────────────
function ChronologySection() {
  const [activeId, setActiveId] = useState<string>(CHRON_EVENTS[0].id);
  const active = CHRON_EVENTS.find(e => e.id === activeId) ?? CHRON_EVENTS[0];

  return (
    <section id="chronology" className="section">
      <div className="container">
        <h2>Chronology — the body's evolution</h2>
        <p className="subtitle">A hand-curated timeline of the lab's milestones, constitutional changes, and releases.</p>
        <div className="chronology-wrap">
          <div className="chronology-axis">
            <span className="chronology-axis-label" style={{ left: "2%"  }}>Sep 2024</span>
            <span className="chronology-axis-label" style={{ left: "50%" }}>Jan 2025</span>
            <span className="chronology-axis-label" style={{ left: "98%" }}>Jun 2025</span>
            {CHRON_EVENTS.map(ev => (
              <button
                key={ev.id}
                className={`chronology-dot ${activeId === ev.id ? "active" : ""}`}
                data-category={ev.category}
                style={{ left: `${eventPct(ev.date)}%` }}
                onClick={() => setActiveId(ev.id)}
                title={ev.title}
              >
                <span className="chronology-dot-tooltip">{ev.date} — {ev.title}</span>
              </button>
            ))}
          </div>
          <div className="chronology-panel">
            <h3>{active.title}</h3>
            <div className="cp-meta">
              {active.date} · <span style={{ textTransform: "uppercase" }}>{active.category}</span>
              {active.constitution_version && ` · constitution v${active.constitution_version}`}
            </div>
            <p className="cp-body">{active.summary}</p>
            <div>
              {active.organs_affected.map(o => <span key={o} className="organ-pill">{o}</span>)}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Attribution ──────────────────────────────────────────────────────────────
function AttributionSection() {
  return (
    <section id="attribution" className="section" style={{ background: "var(--bg2)" }}>
      <div className="container" style={{ maxWidth: 760 }}>
        <div className="attribution-box">
          <h2>Ka Architecture™ — KA2 Methodology</h2>
          <p>Ka Architecture is developed and maintained by Dr. Tdka Kilimanjaro at the University of KMT. The framework is grounded in the ancient Kemetic sciences of order, truth, and balance (Maat) and applied to the design of intelligent digital systems.</p>
          <p>The 42-Nome constitution, 49 Maat-Based Evaluation Principles, and nine-organ body plan are original works of the University of KMT. All implementations must carry this attribution.</p>
          <a href="https://universityofkmt.myshopify.com" target="_blank" rel="noopener noreferrer">University of KMT →</a>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function FooterEl() {
  return (
    <footer className="ka-footer">
      <div className="container">
        <p className="maat-values">Truth · Justice · Balance · Order · Reciprocity</p>
        <div className="glyph">𓂀</div>
        <p className="footer-copy">Ka Architecture™ · Dr. Tdka Kilimanjaro · University of KMT · 2025</p>
      </div>
    </footer>
  );
}

// ─── Ask Scholar Panel ────────────────────────────────────────────────────────
function AskScholarPanel() {
  const [open, setOpen]   = useState(false);
  const [msgs, setMsgs]   = useState<ScholarMsg[]>([
    { role: "ai", content: "Peace. Ask me about projects, operators, or learners in the Ka Education Body." },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy]   = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, open]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs(m => [...m, { role: "user", content: q }]);
    setBusy(true);
    try {
      const r = await fetch("/api/ask-scholar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const d = await r.json() as { question: string; projects: ProjectResult[]; handles: HandleResult[]; error?: string; message?: string };
      if (!r.ok) {
        setMsgs(m => [...m, { role: "ai", content: `Error: ${errMsg(d.error ?? String(r.status))}` }]);
        return;
      }
      const total = d.projects.length + d.handles.length;
      if (total === 0) {
        setMsgs(m => [...m, { role: "ai", content: `No results for "${q}". Try: project, institution, user, operator, learner.` }]);
      } else {
        const lines = [`Found ${total} result${total !== 1 ? "s" : ""}:`];
        d.projects.forEach(p => lines.push(`• ${p.name} — ${p.institutionTypeName} [${p.status}]`));
        d.handles.forEach(h => lines.push(`• ${(h.displayName ?? h.name ?? h.handle ?? "—") as string} [${h.variant}]`));
        setMsgs(m => [...m, { role: "ai", content: lines.join("\n") }]);
      }
    } catch {
      setMsgs(m => [...m, { role: "ai", content: "Cannot reach /api/ask-scholar. Is the server running?" }]);
    } finally { setBusy(false); }
  }

  return (
    <>
      {open && (
        <aside className="ask-scholar-panel" id="ask-scholar-panel">
          <header>
            <h3>𓂀 Ask the Scholar</h3>
            <button className="ask-scholar-close" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="ask-scholar-results">
            {msgs.map((m, i) => (
              <div key={i} className={`scholar-msg ${m.role === "user" ? "scholar-msg-user" : "scholar-msg-ai"}`}>
                {m.content.split("\n").map((line, j) => <div key={j}>{line}</div>)}
              </div>
            ))}
            {busy && <div className="scholar-msg scholar-msg-ai">Searching…</div>}
            <div ref={endRef} />
          </div>
          <form id="ask-scholar-form" onSubmit={submit}>
            <input type="text" name="question" value={input} onChange={e => setInput(e.target.value)} placeholder="what projects exist" required autoComplete="off" />
            <button type="submit" disabled={busy || !input.trim()}>Send</button>
          </form>
          <footer>
            <small>Proxied via the Ka Education Body gateway.</small>
          </footer>
        </aside>
      )}
      <button className="ask-scholar-toggle" id="ask-scholar-toggle" onClick={() => setOpen(o => !o)}>
        {open ? "× Close" : "Ask the Scholar"}
      </button>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <>
      <NavBar />
      <main style={{ paddingTop: 52 }}>
        <BodySection />
        <OrgansSection />
        <BootSection />
        <DiscoverySection />
        <TransferSection />
        <SacredSection />
        <AppsSection />
        <EcosystemSection />
        <BenchSection />
        <PhilosophySection />
        <hr className="section-divider" />
        <LiveProjectsSection />
        <LiveHandlesSection />
        <ChronologySection />
        <AttributionSection />
        <FooterEl />
      </main>
      <AskScholarPanel />
    </>
  );
}
