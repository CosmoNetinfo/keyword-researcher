import { useState } from "react";

const TOPICS = ["AI & ChatGPT", "Linux & Open Source", "Gaming", "WordPress", "Produttività digitale"];

const PHASES = [
  "Scansione articoli esistenti sul tuo sito...",
  "Analisi competitor italiani...",
  "Ricerca keyword e gap di contenuto...",
  "Generazione idee articoli...",
];

const DIFF_COLORS = { bassa: { bg: "#EAF3DE", color: "#3B6D11" }, media: { bg: "#FAEEDA", color: "#854F0B" }, alta: { bg: "#FCEBEB", color: "#A32D2D" } };
const INTENT_COLORS = { informazionale: { bg: "#E6F1FB", color: "#185FA5" }, transazionale: { bg: "#E1F5EE", color: "#0F6E56" }, commerciale: { bg: "#EEEDFE", color: "#534AB7" }, navigazionale: { bg: "#F1EFE8", color: "#5F5E5A" } };

function Pill({ text, colors }) {
  if (!text) return null;
  const c = colors?.[text] || { bg: "#F1EFE8", color: "#5F5E5A" };
  return <span style={{ display: "inline-block", background: c.bg, color: c.color, fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>{text}</span>;
}

function Table({ headers, rows, colWidths }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "var(--color-background-secondary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            {headers.map((h, i) => (
              <th key={i} style={{ padding: "8px 14px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", whiteSpace: "nowrap", width: colWidths?.[i] }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: i % 2 === 0 ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{ padding: "10px 14px", color: "var(--color-text-primary)", verticalAlign: "top" }}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function App() {
  const [url, setUrl] = useState("cosmonet.info");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("articles");

  const finalTopic = topic === "Personalizzato" ? customTopic : topic;
  const newArticles = result?.articles?.filter(a => a.type === "nuovo") || [];
  const updateArticles = result?.articles?.filter(a => a.type === "aggiornamento") || [];

  async function runResearch() {
    if (!url || !finalTopic) return;
    setLoading(true);
    setError("");
    setResult(null);
    setPhaseIndex(0);

    const prompt = `Sei un esperto SEO italiano. Analizza il sito "${url}" e i competitor nella nicchia "${finalTopic}".

FASE 1 - Scansiona "${url}":
Cerca "site:${url} ${finalTopic}" e varianti per trovare articoli già pubblicati.

FASE 2 - Analizza competitor italiani nella nicchia "${finalTopic}":
Trova i principali blog/siti italiani competitor e le loro keyword principali.

FASE 3 - Identifica gap:
Confronta gli articoli esistenti su "${url}" con i competitor per trovare argomenti mancanti e articoli da aggiornare.

Rispondi SOLO con JSON valido, zero testo extra, zero markdown. Formato:
{
  "existing_articles": [
    { "title": "titolo", "url": "url", "topic": "argomento 2-3 parole", "status": "ok|aggiornare" }
  ],
  "competitors": [
    { "name": "nome", "url": "url", "strength": "punto di forza 5 parole" }
  ],
  "keywords": [
    { "keyword": "kw italiana", "difficulty": "bassa|media|alta", "intent": "informazionale|navigazionale|transazionale|commerciale", "volume": "~500/mese" }
  ],
  "articles": [
    { "type": "nuovo|aggiornamento", "title": "Titolo SEO", "description": "1-2 frasi", "existing_url": "url o null", "update_reason": "cosa aggiungere o null", "keywords": ["kw1","kw2"], "priority": "alta|media" }
  ],
  "insights": "2-3 frasi sui gap trovati"
}

Genera almeno 20 keyword, almeno 10 nuovi articoli, almeno 5 aggiornamenti.`;

    try {
      setPhaseIndex(0);
      await new Promise(r => setTimeout(r, 400));
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
          model: "claude-sonnet-4-20250514",
          max_tokens: 5000,
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
      setResult(parsed);
      setActiveTab("articles");
    } catch (e) {
      setError("Errore: " + e.message);
    } finally {
      setLoading(false);
    }
  }

  const tabs = [
    { key: "articles", label: "Nuovi articoli", count: newArticles.length },
    { key: "updates", label: "Da aggiornare", count: updateArticles.length },
    { key: "keywords", label: "Keyword", count: result?.keywords?.length || 0 },
    { key: "competitors", label: "Competitor", count: result?.competitors?.length || 0 },
    { key: "existing", label: "Articoli esistenti", count: result?.existing_articles?.length || 0 },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
        .tab-btn { flex: 1; padding: 9px 6px; font-size: 12px; border: none; border-right: 0.5px solid var(--color-border-tertiary); cursor: pointer; transition: background 0.15s; }
        .tab-btn:last-child { border-right: none; }
        .tab-btn:hover { background: var(--color-background-primary) !important; }
      `}</style>

      <div style={{ maxWidth: 800, margin: "0 auto", padding: "1.5rem 1rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 3px", fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)" }}>Keyword Researcher</h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>Scansiona il tuo sito · analizza competitor · trova keyword e idee articolo</p>
        </div>

        {/* Form */}
        <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1.25rem" }}>
          <div style={{ background: "var(--color-background-secondary)", padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Configurazione analisi</p>
          </div>
          <div style={{ padding: "1rem", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 5 }}>Il tuo sito</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="cosmonet.info" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 11, color: "var(--color-text-tertiary)", marginBottom: 5 }}>Nicchia</label>
                <select value={topic} onChange={e => setTopic(e.target.value)} style={{ width: "100%" }}>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                  <option value="Personalizzato">Personalizzato...</option>
                </select>
              </div>
            </div>
            {topic === "Personalizzato" && (
              <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Es: fotografia digitale, gaming, finanza..." style={{ width: "100%" }} />
            )}
            <button onClick={runResearch} disabled={loading} style={{ width: "100%", padding: "9px 0", fontSize: 13 }}>
              {loading ? "Analisi in corso..." : "Avvia analisi completa ↗"}
            </button>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden", marginBottom: "1.25rem" }}>
            <div style={{ background: "var(--color-background-secondary)", padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Analisi in corso</p>
            </div>
            <div style={{ padding: "1rem" }}>
              {PHASES.map((phase, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", opacity: i <= phaseIndex ? 1 : 0.3, transition: "opacity 0.4s" }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                    background: i < phaseIndex ? "#1D9E75" : "transparent",
                    border: i < phaseIndex ? "none" : i === phaseIndex ? "2px solid #1D9E75" : "0.5px solid var(--color-border-secondary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    animation: i === phaseIndex ? "spin 1s linear infinite" : "none",
                  }}>
                    {i < phaseIndex && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                  <span style={{ fontSize: 13, color: i === phaseIndex ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>{phase}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: "var(--color-background-danger)", color: "var(--color-text-danger)", borderRadius: "var(--border-radius-md)", padding: "10px 14px", fontSize: 13, marginBottom: "1rem" }}>
            {error}
          </div>
        )}

        {/* Results */}
        {result && (
          <div style={{ animation: "fadeUp 0.3s ease" }}>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: "1rem" }}>
              {[
                { label: "Articoli trovati", value: result.existing_articles?.length || 0, color: "var(--color-text-primary)" },
                { label: "Competitor", value: result.competitors?.length || 0, color: "#185FA5" },
                { label: "Keyword", value: result.keywords?.length || 0, color: "#534AB7" },
                { label: "Nuovi articoli", value: newArticles.length, color: "#0F6E56" },
                { label: "Da aggiornare", value: updateArticles.length, color: "#854F0B" },
              ].map((s, i) => (
                <div key={i} style={{ background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", padding: "10px 8px", textAlign: "center" }}>
                  <p style={{ margin: "0 0 2px", fontSize: 22, fontWeight: 500, color: s.color, lineHeight: 1 }}>{s.value}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)", lineHeight: 1.3 }}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* Insights */}
            {result.insights && (
              <div style={{ borderLeft: "3px solid var(--color-border-info)", background: "var(--color-background-info)", borderRadius: "0 var(--border-radius-md) var(--border-radius-md) 0", padding: "10px 14px", marginBottom: "1rem", fontSize: 13, color: "var(--color-text-info)", lineHeight: 1.6 }}>
                {result.insights}
              </div>
            )}

            {/* Main panel with tabs */}
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>

              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                {tabs.map(tab => (
                  <button key={tab.key} className="tab-btn" onClick={() => setActiveTab(tab.key)} style={{
                    background: activeTab === tab.key ? "var(--color-background-primary)" : "var(--color-background-secondary)",
                    fontWeight: activeTab === tab.key ? 500 : 400,
                    color: activeTab === tab.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                  }}>
                    {tab.label}{" "}
                    <span style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>({tab.count})</span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ background: "var(--color-background-primary)" }}>

                {/* Nuovi articoli */}
                {activeTab === "articles" && (
                  newArticles.length === 0
                    ? <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun nuovo articolo suggerito.</p>
                    : <Table
                        headers={["#", "Titolo articolo", "Descrizione", "Keyword target", "Priorità"]}
                        colWidths={["32px", "28%", null, "22%", "70px"]}
                        rows={newArticles.map((a, i) => [
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: 13 }}>{a.title}</span>,
                          <span style={{ color: "var(--color-text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{a.description}</span>,
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                            {a.keywords?.map((k, j) => <span key={j} style={{ background: "#E6F1FB", color: "#185FA5", fontSize: 11, padding: "1px 7px", borderRadius: 20 }}>{k}</span>)}
                          </div>,
                          <span style={{ background: a.priority === "alta" ? "#FAECE7" : "#FAEEDA", color: a.priority === "alta" ? "#993C1D" : "#854F0B", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>{a.priority}</span>,
                        ])}
                      />
                )}

                {/* Da aggiornare */}
                {activeTab === "updates" && (
                  updateArticles.length === 0
                    ? <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun articolo da aggiornare trovato.</p>
                    : <Table
                        headers={["#", "Titolo articolo", "Cosa aggiungere", "URL esistente", "Priorità"]}
                        colWidths={["32px", "25%", null, "22%", "70px"]}
                        rows={updateArticles.map((a, i) => [
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: 13 }}>{a.title}</span>,
                          <span style={{ color: "var(--color-text-secondary)", fontSize: 12, lineHeight: 1.5 }}>{a.update_reason || a.description}</span>,
                          <span style={{ color: "#185FA5", fontSize: 11, wordBreak: "break-all" }}>{a.existing_url || "—"}</span>,
                          <span style={{ background: a.priority === "alta" ? "#FAECE7" : "#FAEEDA", color: a.priority === "alta" ? "#993C1D" : "#854F0B", fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 20 }}>{a.priority}</span>,
                        ])}
                      />
                )}

                {/* Keyword */}
                {activeTab === "keywords" && result.keywords && (
                  <Table
                    headers={["#", "Keyword", "Difficoltà", "Intento", "Volume stimato"]}
                    colWidths={["32px", null, "100px", "130px", "110px"]}
                    rows={result.keywords.map((kw, i) => [
                      <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</span>,
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{kw.keyword}</span>,
                      <Pill text={kw.difficulty} colors={DIFF_COLORS} />,
                      <Pill text={kw.intent} colors={INTENT_COLORS} />,
                      <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{kw.volume || "—"}</span>,
                    ])}
                  />
                )}

                {/* Competitor */}
                {activeTab === "competitors" && (
                  !result.competitors?.length
                    ? <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun competitor trovato.</p>
                    : <Table
                        headers={["#", "Sito", "URL", "Punto di forza"]}
                        colWidths={["32px", "20%", "28%", null]}
                        rows={result.competitors.map((c, i) => [
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>{c.name}</span>,
                          <span style={{ color: "#185FA5", fontSize: 12 }}>{c.url || "—"}</span>,
                          <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{c.strength || "—"}</span>,
                        ])}
                      />
                )}

                {/* Articoli esistenti */}
                {activeTab === "existing" && (
                  !result.existing_articles?.length
                    ? <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun articolo trovato nella scansione.</p>
                    : <Table
                        headers={["#", "Titolo articolo", "Argomento", "URL", "Stato"]}
                        colWidths={["32px", null, "18%", "28%", "110px"]}
                        rows={result.existing_articles.map((a, i) => [
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</span>,
                          <span style={{ fontWeight: 500, color: "var(--color-text-primary)", fontSize: 13 }}>{a.title}</span>,
                          <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>{a.topic || "—"}</span>,
                          <span style={{ color: "#185FA5", fontSize: 11, wordBreak: "break-all" }}>{a.url || "—"}</span>,
                          <Pill text={a.status === "aggiornare" ? "da aggiornare" : "ok"} colors={{ "da aggiornare": { bg: "#FAEEDA", color: "#854F0B" }, ok: { bg: "#EAF3DE", color: "#3B6D11" } }} />,
                        ])}
                      />
                )}

              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
