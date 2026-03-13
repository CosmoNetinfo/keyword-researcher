import { useState } from "react";

const TOPICS = ["AI & ChatGPT", "Linux & Open Source", "Gaming", "WordPress", "Produttività digitale"];

const PHASES = [
  "Scansione articoli esistenti sul tuo sito...",
  "Analisi competitor italiani...",
  "Ricerca keyword e gap di contenuto...",
  "Generazione idee articoli...",
];

function Badge({ text, color }) {
  const colors = {
    green:  { bg: "#EAF3DE", text: "#3B6D11" },
    amber:  { bg: "#FAEEDA", text: "#854F0B" },
    red:    { bg: "#FCEBEB", text: "#A32D2D" },
    blue:   { bg: "#E6F1FB", text: "#185FA5" },
    purple: { bg: "#EEEDFE", text: "#534AB7" },
    teal:   { bg: "#E1F5EE", text: "#0F6E56" },
    gray:   { bg: "#F1EFE8", text: "#5F5E5A" },
    coral:  { bg: "#FAECE7", text: "#993C1D" },
  };
  const c = colors[color] || colors.blue;
  return (
    <span style={{
      display: "inline-block", background: c.bg, color: c.text,
      fontSize: 11, fontWeight: 500, padding: "2px 8px", borderRadius: 6, whiteSpace: "nowrap",
    }}>{text}</span>
  );
}

function KeywordCard({ kw, index }) {
  const diffColor = kw.difficulty === "bassa" ? "green" : kw.difficulty === "media" ? "amber" : "red";
  const intentColor = kw.intent === "informazionale" ? "blue" : kw.intent === "transazionale" ? "teal" : "purple";
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr auto",
      alignItems: "center", gap: 10, padding: "10px 12px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      animation: "fadeUp 0.25s ease both", animationDelay: `${index * 0.025}s`,
    }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", fontVariantNumeric: "tabular-nums", textAlign: "right" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <span style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{kw.keyword}</span>
      <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
        <Badge text={kw.difficulty} color={diffColor} />
        <Badge text={kw.intent} color={intentColor} />
        {kw.volume && <Badge text={kw.volume} color="purple" />}
      </div>
    </div>
  );
}

function ArticleCard({ article, index }) {
  const isUpdate = article.type === "aggiornamento";
  return (
    <div style={{
      padding: "14px 16px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      borderLeft: isUpdate ? "3px solid #1D9E75" : "3px solid transparent",
      animation: "fadeUp 0.25s ease both", animationDelay: `${index * 0.04}s`,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", minWidth: 20, paddingTop: 2, fontVariantNumeric: "tabular-nums" }}>
          {String(index + 1).padStart(2, "0")}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.3 }}>
              {article.title}
            </span>
            {isUpdate ? <Badge text="aggiornamento" color="teal" /> : <Badge text="nuovo" color="blue" />}
            {article.priority === "alta" && <Badge text="★ alta priorità" color="coral" />}
          </div>
          <p style={{ margin: "0 0 6px", fontSize: 13, color: "var(--color-text-secondary)", lineHeight: 1.5 }}>
            {article.description}
          </p>
          {isUpdate && article.update_reason && (
            <div style={{ margin: "6px 0", padding: "6px 10px", background: "#E1F5EE", borderRadius: 6, fontSize: 12, color: "#0F6E56" }}>
              Cosa aggiungere: {article.update_reason}
            </div>
          )}
          {isUpdate && article.existing_url && (
            <p style={{ margin: "4px 0 6px", fontSize: 11, color: "var(--color-text-tertiary)" }}>
              Articolo: {article.existing_url}
            </p>
          )}
          {article.keywords?.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 4 }}>
              {article.keywords.map((k, i) => <Badge key={i} text={k} color="blue" />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExistingCard({ article, index }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "28px 1fr auto",
      alignItems: "center", gap: 10, padding: "10px 12px",
      borderBottom: "0.5px solid var(--color-border-tertiary)",
      animation: "fadeUp 0.25s ease both", animationDelay: `${index * 0.025}s`,
    }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" }}>{article.title}</p>
        {article.url && <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-tertiary)" }}>{article.url}</p>}
      </div>
      <div style={{ display: "flex", gap: 5 }}>
        {article.topic && <Badge text={article.topic} color="gray" />}
        {article.status === "aggiornare" && <Badge text="da aggiornare" color="amber" />}
        {article.status === "ok" && <Badge text="ok" color="green" />}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  const colors = {
    default: { val: "var(--color-text-primary)", bg: "var(--color-background-secondary)" },
    teal:    { val: "#0F6E56", bg: "#E1F5EE" },
    amber:   { val: "#854F0B", bg: "#FAEEDA" },
    blue:    { val: "#185FA5", bg: "#E6F1FB" },
  };
  const c = colors[color] || colors.default;
  return (
    <div style={{ background: c.bg, borderRadius: "var(--border-radius-md)", padding: "14px 12px", textAlign: "center" }}>
      <p style={{ margin: "0 0 3px", fontSize: 26, fontWeight: 500, color: c.val, lineHeight: 1 }}>{value}</p>
      <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>{label}</p>
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
    { key: "articles", label: `Nuovi articoli`, count: newArticles.length },
    { key: "updates", label: `Da aggiornare`, count: updateArticles.length },
    { key: "keywords", label: `Keyword`, count: result?.keywords?.length || 0 },
    { key: "existing", label: `Articoli esistenti`, count: result?.existing_articles?.length || 0 },
  ];

  return (
    <>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes spin { from { transform:rotate(0deg); } to { transform:rotate(360deg); } }
        * { box-sizing: border-box; }
        input, select, button { font-family: inherit; }
      `}</style>

      <div style={{ maxWidth: 760, margin: "0 auto", padding: "2rem 1rem" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 4px", fontSize: 20, fontWeight: 500, color: "var(--color-text-primary)" }}>
            Keyword Researcher
          </h1>
          <p style={{ margin: 0, fontSize: 13, color: "var(--color-text-secondary)" }}>
            Scansiona il tuo sito · analizza competitor · trova keyword e idee articolo
          </p>
        </div>

        {/* Form */}
        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Il tuo sito</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="cosmonet.info" style={{ width: "100%" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, color: "var(--color-text-secondary)", marginBottom: 5 }}>Nicchia</label>
              <select value={topic} onChange={e => setTopic(e.target.value)} style={{ width: "100%" }}>
                {TOPICS.map(t => <option key={t}>{t}</option>)}
                <option value="Personalizzato">Personalizzato...</option>
              </select>
            </div>
          </div>
          {topic === "Personalizzato" && (
            <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Es: fotografia digitale, gaming, finanza..." style={{ width: "100%", marginBottom: 12 }} />
          )}
          <button onClick={runResearch} disabled={loading} style={{ width: "100%", padding: "9px 0", fontSize: 14 }}>
            {loading ? "Analisi in corso..." : "Avvia analisi completa ↗"}
          </button>
        </div>

        {/* Loading steps */}
        {loading && (
          <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", marginBottom: "1.5rem" }}>
            {PHASES.map((phase, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", opacity: i <= phaseIndex ? 1 : 0.3, transition: "opacity 0.4s" }}>
                <div style={{
                  width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                  background: i < phaseIndex ? "#1D9E75" : "transparent",
                  border: i < phaseIndex ? "none" : i === phaseIndex ? "2px solid #1D9E75" : "0.5px solid var(--color-border-secondary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: i === phaseIndex ? "spin 1s linear infinite" : "none",
                }}>
                  {i < phaseIndex && (
                    <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                      <path d="M1.5 4.5l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span style={{ fontSize: 13, color: i === phaseIndex ? "var(--color-text-primary)" : "var(--color-text-tertiary)" }}>
                  {phase}
                </span>
              </div>
            ))}
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
          <div style={{ animation: "fadeUp 0.35s ease" }}>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: "1.25rem" }}>
              <StatCard label="Articoli trovati" value={result.existing_articles?.length || 0} />
              <StatCard label="Competitor" value={result.competitors?.length || 0} color="blue" />
              <StatCard label="Nuovi articoli" value={newArticles.length} color="teal" />
              <StatCard label="Da aggiornare" value={updateArticles.length} color="amber" />
            </div>

            {/* Insights */}
            {result.insights && (
              <div style={{ borderLeft: "3px solid var(--color-border-info)", background: "var(--color-background-info)", borderRadius: "0 var(--border-radius-md) var(--border-radius-md) 0", padding: "10px 14px", marginBottom: "1.25rem", fontSize: 13, color: "var(--color-text-info)", lineHeight: 1.6 }}>
                {result.insights}
              </div>
            )}

            {/* Competitors */}
            {result.competitors?.length > 0 && (
              <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", marginBottom: "1.25rem", overflow: "hidden" }}>
                <div style={{ background: "var(--color-background-secondary)", padding: "8px 14px", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 500, color: "var(--color-text-secondary)" }}>Competitor ({result.competitors.length})</p>
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "var(--color-background-secondary)" }}>
                      <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)", width: 32 }}>#</th>
                      <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)", width: "35%" }}>Sito</th>
                      <th style={{ padding: "7px 12px", textAlign: "left", fontSize: 11, fontWeight: 500, color: "var(--color-text-tertiary)", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>Punto di forza</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.competitors.map((c, i) => (
                      <tr key={i} style={{ borderBottom: "0.5px solid var(--color-border-tertiary)", background: i % 2 === 0 ? "var(--color-background-primary)" : "var(--color-background-secondary)" }}>
                        <td style={{ padding: "9px 12px", color: "var(--color-text-tertiary)", fontSize: 11 }}>{i + 1}</td>
                        <td style={{ padding: "9px 12px", fontWeight: 500, color: "var(--color-text-primary)" }}>{c.name}</td>
                        <td style={{ padding: "9px 12px", color: "var(--color-text-secondary)" }}>{c.strength || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Tabs + Content */}
            <div style={{ border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", overflow: "hidden" }}>

              {/* Tab bar */}
              <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", background: "var(--color-background-secondary)" }}>
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
                    flex: 1, padding: "10px 8px", fontSize: 12, fontWeight: activeTab === tab.key ? 500 : 400,
                    color: activeTab === tab.key ? "var(--color-text-primary)" : "var(--color-text-secondary)",
                    background: activeTab === tab.key ? "var(--color-background-primary)" : "transparent",
                    border: "none", borderRight: "0.5px solid var(--color-border-tertiary)",
                    borderBottom: activeTab === tab.key ? "1px solid var(--color-background-primary)" : "none",
                    cursor: "pointer", marginBottom: activeTab === tab.key ? -1 : 0,
                  }}>
                    {tab.label}
                    <span style={{ display: "inline-block", marginLeft: 5, background: activeTab === tab.key ? "var(--color-background-secondary)" : "transparent", borderRadius: 10, padding: "0 5px", fontSize: 11, color: "var(--color-text-tertiary)" }}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div style={{ background: "var(--color-background-primary)" }}>

                {activeTab === "articles" && (
                  <>
                    {newArticles.length === 0 ? (
                      <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun nuovo articolo suggerito.</p>
                    ) : newArticles.map((a, i) => <ArticleCard key={i} article={a} index={i} />)}
                  </>
                )}

                {activeTab === "updates" && (
                  <>
                    {updateArticles.length === 0 ? (
                      <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun articolo da aggiornare trovato.</p>
                    ) : updateArticles.map((a, i) => <ArticleCard key={i} article={a} index={i} />)}
                  </>
                )}

                {activeTab === "keywords" && (
                  <>
                    <div style={{ display: "flex", gap: 6, padding: "10px 12px", borderBottom: "0.5px solid var(--color-border-tertiary)", flexWrap: "wrap" }}>
                      <Badge text="verde = bassa difficoltà" color="green" />
                      <Badge text="giallo = media" color="amber" />
                      <Badge text="rosso = alta" color="red" />
                      <Badge text="blu = informazionale" color="blue" />
                      <Badge text="teal = transazionale" color="teal" />
                    </div>
                    {result.keywords?.map((kw, i) => <KeywordCard key={i} kw={kw} index={i} />)}
                  </>
                )}

                {activeTab === "existing" && (
                  <>
                    {(!result.existing_articles || result.existing_articles.length === 0) ? (
                      <p style={{ padding: "2rem", textAlign: "center", fontSize: 13, color: "var(--color-text-secondary)" }}>Nessun articolo trovato nella scansione.</p>
                    ) : result.existing_articles.map((a, i) => <ExistingCard key={i} article={a} index={i} />)}
                  </>
                )}

              </div>
            </div>

          </div>
        )}
      </div>
    </>
  );
}
