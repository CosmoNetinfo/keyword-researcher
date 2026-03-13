import { useState, useEffect } from "react";

const TOPICS = ["AI & ChatGPT", "Linux & Open Source", "Gaming", "WordPress", "Produttività digitale"];
const PHASES = ["Scansione articoli esistenti...", "Analisi competitor italiani...", "Ricerca keyword e gap...", "Generazione idee articoli..."];
const DIFF_COLORS = { bassa: { bg: "#EAF3DE", color: "#3B6D11" }, media: { bg: "#FAEEDA", color: "#854F0B" }, alta: { bg: "#FCEBEB", color: "#A32D2D" } };
const INTENT_COLORS = { informazionale: { bg: "#E6F1FB", color: "#185FA5" }, transazionale: { bg: "#E1F5EE", color: "#0F6E56" }, commerciale: { bg: "#EEEDFE", color: "#534AB7" }, navigazionale: { bg: "#F1EFE8", color: "#5F5E5A" } };
const KW_STATUS = { da_fare: { label: "da fare", bg: "#F1EFE8", color: "#5F5E5A" }, in_lavorazione: { label: "in lavorazione", bg: "#FAEEDA", color: "#854F0B" }, fatto: { label: "fatto ✓", bg: "#EAF3DE", color: "#3B6D11" } };
const ART_STATUS = { da_scrivere: { label: "da scrivere", bg: "#F1EFE8", color: "#5F5E5A" }, in_lavorazione: { label: "in lavorazione", bg: "#FAEEDA", color: "#854F0B" }, pubblicato: { label: "pubblicato ✓", bg: "#EAF3DE", color: "#3B6D11" } };

function Pill({ text, map }) {
  if (!text) return null;
  const c = map?.[text] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return <span style={{ display: "inline-block", background: c.bg, color: c.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{c.label || text}</span>;
}

function StatusCycle({ value, map, onChange }) {
  const keys = Object.keys(map);
  const curr = map[value] || map[keys[0]];
  function next() {
    const idx = keys.indexOf(value);
    onChange(keys[(idx + 1) % keys.length]);
  }
  return (
    <button onClick={next} title="Clicca per cambiare stato" style={{ background: curr.bg, color: curr.color, border: "none", borderRadius: 20, fontSize: 11, fontWeight: 500, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap" }}>
      {curr.label}
    </button>
  );
}

function SectionTable({ headers, rows, colWidths }) {
  if (!rows?.length) return <p style={{ padding: "1.5rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun dato disponibile.</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", width: colWidths?.[i] }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: i % 2 === 0 ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "9px 12px", verticalAlign: "middle" }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function loadAnalyses() {
  try { return JSON.parse(localStorage.getItem("kr_analyses") || "[]"); } catch { return []; }
}
function saveAnalyses(list) {
  localStorage.setItem("kr_analyses", JSON.stringify(list));
}

function exportExcel(analysis) {
  const rows = [
    ["KEYWORD RESEARCHER - Analisi del " + new Date(analysis.date).toLocaleDateString("it-IT")],
    ["Sito: " + analysis.url, "Nicchia: " + analysis.topic],
    [],
    ["=== KEYWORD ==="],
    ["#", "Keyword", "Difficoltà", "Intento", "Volume", "Stato"],
    ...(analysis.result.keywords || []).map((kw, i) => [
      i + 1, kw.keyword, kw.difficulty, kw.intent, kw.volume || "",
      KW_STATUS[analysis.statuses?.keywords?.[i] || "da_fare"]?.label || "da fare"
    ]),
    [],
    ["=== NUOVI ARTICOLI ==="],
    ["#", "Titolo", "Descrizione", "Keyword target", "Priorità", "Stato"],
    ...(analysis.result.articles || []).filter(a => a.type === "nuovo").map((a, i) => [
      i + 1, a.title, a.description, (a.keywords || []).join(", "), a.priority,
      ART_STATUS[analysis.statuses?.articles_new?.[i] || "da_scrivere"]?.label || "da scrivere"
    ]),
    [],
    ["=== DA AGGIORNARE ==="],
    ["#", "Titolo", "Cosa aggiungere", "URL esistente", "Priorità", "Stato"],
    ...(analysis.result.articles || []).filter(a => a.type === "aggiornamento").map((a, i) => [
      i + 1, a.title, a.update_reason || "", a.existing_url || "", a.priority,
      ART_STATUS[analysis.statuses?.articles_upd?.[i] || "da_scrivere"]?.label || "da scrivere"
    ]),
    [],
    ["=== COMPETITOR ==="],
    ["#", "Sito", "URL", "Punto di forza"],
    ...(analysis.result.competitors || []).map((c, i) => [i + 1, c.name, c.url || "", c.strength || ""]),
    [],
    ["=== INSIGHTS ==="],
    [analysis.result.insights || ""],
  ];

  const csvContent = rows.map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\n");

  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keyword-research-${analysis.url}-${new Date(analysis.date).toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportWord(analysis) {
  const date = new Date(analysis.date).toLocaleDateString("it-IT");
  const newArts = (analysis.result.articles || []).filter(a => a.type === "nuovo");
  const updArts = (analysis.result.articles || []).filter(a => a.type === "aggiornamento");

  const tableStyle = `border-collapse:collapse;width:100%;margin-bottom:20px;font-size:13px;`;
  const thStyle = `background:#f5f5f5;border:1px solid #ccc;padding:8px 10px;text-align:left;font-size:12px;`;
  const tdStyle = `border:1px solid #ccc;padding:7px 10px;vertical-align:top;`;

  function table(headers, rows) {
    return `<table style="${tableStyle}">
      <tr>${headers.map(h => `<th style="${thStyle}">${h}</th>`).join("")}</tr>
      ${rows.map(row => `<tr>${row.map(cell => `<td style="${tdStyle}">${cell}</td>`).join("")}</tr>`).join("")}
    </table>`;
  }

  const html = `
    <html><head><meta charset="UTF-8">
    <style>body{font-family:Calibri,sans-serif;margin:40px;color:#222;}h1{font-size:20px;color:#1a1a2e;}h2{font-size:15px;color:#333;margin-top:28px;border-bottom:1px solid #ddd;padding-bottom:4px;}p{font-size:13px;line-height:1.6;}</style>
    </head><body>
    <h1>Keyword Researcher — Analisi del ${date}</h1>
    <p><strong>Sito:</strong> ${analysis.url} &nbsp;|&nbsp; <strong>Nicchia:</strong> ${analysis.topic}</p>
    ${analysis.result.insights ? `<p style="background:#e8f4fd;border-left:4px solid #3b82f6;padding:10px 14px;border-radius:0 6px 6px 0;font-size:13px;">${analysis.result.insights}</p>` : ""}

    <h2>Keyword (${(analysis.result.keywords || []).length})</h2>
    ${table(["#", "Keyword", "Difficoltà", "Intento", "Volume", "Stato"],
      (analysis.result.keywords || []).map((kw, i) => [
        i + 1, `<strong>${kw.keyword}</strong>`, kw.difficulty, kw.intent, kw.volume || "—",
        KW_STATUS[analysis.statuses?.keywords?.[i] || "da_fare"]?.label || "da fare"
      ])
    )}

    <h2>Nuovi articoli da scrivere (${newArts.length})</h2>
    ${table(["#", "Titolo articolo", "Descrizione", "Keyword target", "Priorità", "Stato"],
      newArts.map((a, i) => [
        i + 1, `<strong>${a.title}</strong>`, a.description || "", (a.keywords || []).join(", "), a.priority,
        ART_STATUS[analysis.statuses?.articles_new?.[i] || "da_scrivere"]?.label || "da scrivere"
      ])
    )}

    <h2>Articoli da aggiornare (${updArts.length})</h2>
    ${table(["#", "Titolo", "Cosa aggiungere", "URL esistente", "Priorità", "Stato"],
      updArts.map((a, i) => [
        i + 1, `<strong>${a.title}</strong>`, a.update_reason || a.description || "", a.existing_url || "—", a.priority,
        ART_STATUS[analysis.statuses?.articles_upd?.[i] || "da_scrivere"]?.label || "da scrivere"
      ])
    )}

    <h2>Competitor (${(analysis.result.competitors || []).length})</h2>
    ${table(["#", "Sito", "URL", "Punto di forza"],
      (analysis.result.competitors || []).map((c, i) => [i + 1, `<strong>${c.name}</strong>`, c.url || "—", c.strength || "—"])
    )}

    <h2>Articoli esistenti trovati (${(analysis.result.existing_articles || []).length})</h2>
    ${table(["#", "Titolo", "Argomento", "URL", "Stato"],
      (analysis.result.existing_articles || []).map((a, i) => [i + 1, `<strong>${a.title}</strong>`, a.topic || "—", a.url || "—", a.status === "aggiornare" ? "da aggiornare" : "ok"])
    )}
    </body></html>`;

  const blob = new Blob([html], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `keyword-research-${analysis.url}-${new Date(analysis.date).toISOString().slice(0, 10)}.doc`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [view, setView] = useState("new");
  const [url, setUrl] = useState("cosmonet.info");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("articles");
  const [analyses, setAnalyses] = useState(loadAnalyses);
  const [currentId, setCurrentId] = useState(null);

  const finalTopic = topic === "Personalizzato" ? customTopic : topic;
  const current = analyses.find(a => a.id === currentId) || analyses[0] || null;

  function updateCurrent(updater) {
    setAnalyses(prev => {
      const next = prev.map(a => a.id === current.id ? updater(a) : a);
      saveAnalyses(next);
      return next;
    });
  }

  function setKwStatus(i, val) {
    updateCurrent(a => ({ ...a, statuses: { ...a.statuses, keywords: { ...(a.statuses?.keywords || {}), [i]: val } } }));
  }
  function setArtNewStatus(i, val) {
    updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_new: { ...(a.statuses?.articles_new || {}), [i]: val } } }));
  }
  function setArtUpdStatus(i, val) {
    updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_upd: { ...(a.statuses?.articles_upd || {}), [i]: val } } }));
  }
  function deleteAnalysis(id) {
    setAnalyses(prev => { const next = prev.filter(a => a.id !== id); saveAnalyses(next); return next; });
    if (currentId === id) setCurrentId(null);
  }

  async function runResearch() {
    if (!url || !finalTopic) return;
    setLoading(true);
    setError("");
    setPhaseIndex(0);
    setView("new");

    const prompt = `Sei un esperto SEO italiano. Analizza il sito "${url}" e i competitor nella nicchia "${finalTopic}".
Cerca "site:${url} ${finalTopic}" e varianti per trovare articoli già pubblicati.
Trova i principali competitor italiani e le loro keyword.
Identifica gap: argomenti mancanti e articoli da aggiornare.

Rispondi SOLO con JSON valido, zero testo extra, zero markdown:
{
  "existing_articles": [{ "title": "titolo", "url": "url", "topic": "argomento 2-3 parole", "status": "ok|aggiornare" }],
  "competitors": [{ "name": "nome", "url": "url", "strength": "punto di forza 5 parole" }],
  "keywords": [{ "keyword": "kw italiana", "difficulty": "bassa|media|alta", "intent": "informazionale|navigazionale|transazionale|commerciale", "volume": "~500/mese" }],
  "articles": [{ "type": "nuovo|aggiornamento", "title": "Titolo SEO", "description": "1-2 frasi", "existing_url": "url o null", "update_reason": "cosa aggiungere o null", "keywords": ["kw1","kw2"], "priority": "alta|media" }],
  "insights": "2-3 frasi sui gap trovati"
}
Genera almeno 20 keyword, 10 nuovi articoli, 5 aggiornamenti.`;

    try {
      setPhaseIndex(0); await new Promise(r => setTimeout(r, 400));
      setPhaseIndex(1);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": import.meta.env.VITE_ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514", max_tokens: 5000,
          tools: [{ type: "web_search_20250305", name: "web_search" }],
          messages: [{ role: "user", content: prompt }],
        }),
      });
      setPhaseIndex(2);
      const data = await response.json();
      if (data.error) throw new Error(data.error.message);
      const textBlock = data.content?.find(b => b.type === "text");
      if (!textBlock) throw new Error("Nessuna risposta ricevuta.");
      setPhaseIndex(3);
      let jsonStr = textBlock.text.trim().replace(/```json|```/g, "").trim();
      const s = jsonStr.indexOf("{"), e = jsonStr.lastIndexOf("}");
      if (s !== -1 && e !== -1) jsonStr = jsonStr.slice(s, e + 1);
      const parsed = JSON.parse(jsonStr);

      const newAnalysis = { id: Date.now(), date: new Date().toISOString(), url, topic: finalTopic, result: parsed, statuses: {} };
      setAnalyses(prev => { const next = [newAnalysis, ...prev]; saveAnalyses(next); return next; });
      setCurrentId(newAnalysis.id);
      setActiveTab("articles");
    } catch (e) {
      setError("Errore: " + e.message);
    } finally { setLoading(false); }
  }

  const result = current?.result;
  const newArticles = result?.articles?.filter(a => a.type === "nuovo") || [];
  const updateArticles = result?.articles?.filter(a => a.type === "aggiornamento") || [];

  const tabs = [
    { key: "articles", label: "Nuovi articoli", count: newArticles.length },
    { key: "updates", label: "Da aggiornare", count: updateArticles.length },
    { key: "keywords", label: "Keyword", count: result?.keywords?.length || 0 },
    { key: "competitors", label: "Competitor", count: result?.competitors?.length || 0 },
    { key: "existing", label: "Esistenti", count: result?.existing_articles?.length || 0 },
  ];

  const navBtnStyle = (active) => ({
    padding: "7px 16px", fontSize: 13, fontWeight: active ? 500 : 400, border: "none", cursor: "pointer",
    background: active ? "var(--color-background-primary)" : "transparent",
    color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
    borderBottom: active ? "2px solid var(--color-text-primary)" : "2px solid transparent",
  });

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        .tab-btn { flex:1; padding:9px 6px; font-size:12px; border:none; border-right:0.5px solid var(--color-border-tertiary); cursor:pointer; }
        .tab-btn:last-child { border-right:none; }
        .tab-btn:hover { background: var(--color-background-primary) !important; }
        .hist-row:hover { background: var(--color-background-secondary) !important; }
      `}</style>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {/* Top nav */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem", borderBottom: "0.5px solid var(--color-border-tertiary)", paddingBottom: "0.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 2px", fontSize: 16, fontWeight: 500, color: "var(--color-text-primary)" }}>Keyword Researcher</h1>
            <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-tertiary)" }}>cosmonet.info · {analyses.length} analisi salvate</p>
          </div>
          <div style={{ display: "flex", gap: 4 }}>
            <button onClick={() => setView("new")} style={navBtnStyle(view === "new")}>Nuova analisi</button>
            <button onClick={() => setView("history")} style={navBtnStyle(view === "history")}>
              Storico {analyses.length > 0 && <span style={{ background: "var(--color-background-secondary)", borderRadius: 10, padding: "1px 6px", fontSize: 11, marginLeft: 4 }}>{analyses.length}</span>}
            </button>
          </div>
        </div>

        {/* NEW ANALYSIS VIEW */}
        {view === "new" && (
          <>
            {/* Form */}
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1rem" }}>
              <div style={{ background: "var(--color-background-secondary)", padding: "7px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Nuova analisi</p>
              </div>
              <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Sito</label>
                    <input value={url} onChange={e => setUrl(e.target.value)} placeholder="cosmonet.info" style={{ width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 4 }}>Nicchia</label>
                    <select value={topic} onChange={e => setTopic(e.target.value)} style={{ width: "100%" }}>
                      {TOPICS.map(t => <option key={t}>{t}</option>)}
                      <option value="Personalizzato">Personalizzato...</option>
                    </select>
                  </div>
                </div>
                {topic === "Personalizzato" && <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Es: fotografia digitale..." style={{ width: "100%" }} />}
                <button onClick={runResearch} disabled={loading} style={{ width: "100%", padding: "9px 0", fontSize: 13 }}>
                  {loading ? "Analisi in corso..." : "Avvia analisi completa ↗"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {loading && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem", marginBottom: "1rem" }}>
                {PHASES.map((phase, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", opacity: i <= phaseIndex ? 1 : 0.3, transition: "opacity 0.4s" }}>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", flexShrink: 0, background: i < phaseIndex ? "#1D9E75" : "transparent", border: i < phaseIndex ? "none" : i === phaseIndex ? "2px solid #1D9E75" : "0.5px solid var(--color-border-secondary)", display: "flex", alignItems: "center", justifyContent: "center", animation: i === phaseIndex ? "spin 1s linear infinite" : "none" }}>
                      {i < phaseIndex && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ fontSize: 13, color: i === phaseIndex ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>{phase}</span>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 13, marginBottom: "1rem" }}>{error}</div>}

            {/* Results */}
            {current && result && (
              <div style={{ animation: "fadeUp 0.3s ease" }}>

                {/* Stats + export */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: "1rem", flexWrap: "wrap" }}>
                  {[
                    { label: "Trovati", value: result.existing_articles?.length || 0 },
                    { label: "Competitor", value: result.competitors?.length || 0 },
                    { label: "Keyword", value: result.keywords?.length || 0 },
                    { label: "Nuovi", value: newArticles.length },
                    { label: "Aggiornamenti", value: updateArticles.length },
                  ].map((s, i) => (
                    <div key={i} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "8px 12px", textAlign: "center", minWidth: 70 }}>
                      <p style={{ margin: "0 0 1px", fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1 }}>{s.value}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{s.label}</p>
                    </div>
                  ))}
                  <div style={{ flex: 1 }} />
                  <button onClick={() => exportExcel(current)} style={{ padding: "7px 14px", fontSize: 12 }}>⬇ CSV / Excel</button>
                  <button onClick={() => exportWord(current)} style={{ padding: "7px 14px", fontSize: 12 }}>⬇ Word (.doc)</button>
                </div>

                {result.insights && (
                  <div style={{ borderLeft: "3px solid var(--color-border-info)", background: "var(--color-background-info)", borderRadius: "0 6px 6px 0", padding: "9px 14px", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-info)", lineHeight: 1.6 }}>
                    {result.insights}
                  </div>
                )}

                {/* Tabs */}
                <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
                  <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    {tabs.map(tab => (
                      <button key={tab.key} className="tab-btn" onClick={() => setActiveTab(tab.key)} style={{ background: activeTab === tab.key ? "var(--color-background-primary)" : "var(--color-background-secondary)", fontWeight: activeTab === tab.key ? 500 : 400, color: activeTab === tab.key ? "var(--color-text-primary)" : "var(--color-text-secondary)" }}>
                        {tab.label} <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>({tab.count})</span>
                      </button>
                    ))}
                  </div>

                  <div style={{ background: "var(--color-background-primary)" }}>

                    {activeTab === "articles" && (
                      <SectionTable
                        headers={["#", "Titolo articolo", "Descrizione", "Keyword", "Priorità", "Stato"]}
                        colWidths={["32px", "24%", null, "20%", "68px", "130px"]}
                        rows={newArticles.map((a, i) => [
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</span>,
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{a.description}</span>,
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>{(a.keywords || []).map((k, j) => <span key={j} style={{ background: "#E6F1FB", color: "#185FA5", fontSize: 11, padding: "1px 7px", borderRadius: 20 }}>{k}</span>)}</div>,
                          <Pill text={a.priority} map={{ alta: { bg: "#FAECE7", color: "#993C1D", label: "alta" }, media: { bg: "#FAEEDA", color: "#854F0B", label: "media" } }} />,
                          <StatusCycle value={current.statuses?.articles_new?.[i] || "da_scrivere"} map={ART_STATUS} onChange={v => setArtNewStatus(i, v)} />,
                        ])}
                      />
                    )}

                    {activeTab === "updates" && (
                      <SectionTable
                        headers={["#", "Titolo", "Cosa aggiungere", "URL esistente", "Priorità", "Stato"]}
                        colWidths={["32px", "22%", null, "20%", "68px", "130px"]}
                        rows={updateArticles.map((a, i) => [
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</span>,
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>{a.update_reason || a.description}</span>,
                          <span style={{ fontSize: 11, color: "#185FA5", wordBreak: "break-all" }}>{a.existing_url || "—"}</span>,
                          <Pill text={a.priority} map={{ alta: { bg: "#FAECE7", color: "#993C1D", label: "alta" }, media: { bg: "#FAEEDA", color: "#854F0B", label: "media" } }} />,
                          <StatusCycle value={current.statuses?.articles_upd?.[i] || "da_scrivere"} map={ART_STATUS} onChange={v => setArtUpdStatus(i, v)} />,
                        ])}
                      />
                    )}

                    {activeTab === "keywords" && (
                      <SectionTable
                        headers={["#", "Keyword", "Difficoltà", "Intento", "Volume", "Stato"]}
                        colWidths={["32px", null, "90px", "140px", "100px", "130px"]}
                        rows={(result.keywords || []).map((kw, i) => [
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500 }}>{kw.keyword}</span>,
                          <Pill text={kw.difficulty} map={DIFF_COLORS} />,
                          <Pill text={kw.intent} map={INTENT_COLORS} />,
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{kw.volume || "—"}</span>,
                          <StatusCycle value={current.statuses?.keywords?.[i] || "da_fare"} map={KW_STATUS} onChange={v => setKwStatus(i, v)} />,
                        ])}
                      />
                    )}

                    {activeTab === "competitors" && (
                      <SectionTable
                        headers={["#", "Sito", "URL", "Punto di forza"]}
                        colWidths={["32px", "22%", "28%", null]}
                        rows={(result.competitors || []).map((c, i) => [
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500 }}>{c.name}</span>,
                          <span style={{ fontSize: 11, color: "#185FA5" }}>{c.url || "—"}</span>,
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{c.strength || "—"}</span>,
                        ])}
                      />
                    )}

                    {activeTab === "existing" && (
                      <SectionTable
                        headers={["#", "Titolo articolo", "Argomento", "URL", "Stato"]}
                        colWidths={["32px", null, "18%", "28%", "110px"]}
                        rows={(result.existing_articles || []).map((a, i) => [
                          <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, fontSize: 13 }}>{a.title}</span>,
                          <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.topic || "—"}</span>,
                          <span style={{ fontSize: 11, color: "#185FA5", wordBreak: "break-all" }}>{a.url || "—"}</span>,
                          <Pill text={a.status === "aggiornare" ? "da aggiornare" : "ok"} map={{ "da aggiornare": { bg: "#FAEEDA", color: "#854F0B", label: "da aggiornare" }, ok: { bg: "#EAF3DE", color: "#3B6D11", label: "ok" } }} />,
                        ])}
                      />
                    )}

                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* HISTORY VIEW */}
        {view === "history" && (
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>
            <div style={{ background: "var(--color-background-secondary)", padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Storico analisi ({analyses.length})</p>
            </div>
            {analyses.length === 0 ? (
              <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessuna analisi salvata. Avvia la prima analisi!</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Data</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Sito</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Nicchia</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Keyword</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Articoli</th>
                    <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)" }}>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.map((a, i) => (
                    <tr key={a.id} className="hist-row" style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: i % 2 === 0 ? "var(--color-background-primary)" : "var(--color-background-secondary)", cursor: "pointer" }}>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                        {new Date(a.date).toLocaleDateString("it-IT")}
                      </td>
                      <td style={{ padding: "10px 12px", fontWeight: 500 }}>{a.url}</td>
                      <td style={{ padding: "10px 12px", fontSize: 12, color: "var(--color-text-secondary)" }}>{a.topic}</td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#EEEDFE", color: "#534AB7", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
                          {a.result?.keywords?.length || 0}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{ background: "#E1F5EE", color: "#0F6E56", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>
                          {a.result?.articles?.length || 0}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button onClick={() => { setCurrentId(a.id); setActiveTab("articles"); setView("new"); }} style={{ fontSize: 11, padding: "4px 10px" }}>Apri</button>
                          <button onClick={() => exportExcel(a)} style={{ fontSize: 11, padding: "4px 10px" }}>CSV</button>
                          <button onClick={() => exportWord(a)} style={{ fontSize: 11, padding: "4px 10px" }}>Word</button>
                          <button onClick={() => { if (confirm("Eliminare questa analisi?")) deleteAnalysis(a.id); }} style={{ fontSize: 11, padding: "4px 10px", background: "var(--color-background-danger)", color: "var(--color-text-danger)", border: "none", borderRadius: 6, cursor: "pointer" }}>✕</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

      </div>
    </>
  );
}
