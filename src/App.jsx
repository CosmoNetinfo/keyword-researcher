import { useState, useEffect, startTransition } from "react";
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc,
  serverTimestamp
} from "firebase/firestore";
import PianoEditoriale from "./components/PianoEditoriale";

async function loadXLSX() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    s.onload = () => resolve(window.XLSX);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

const TOPICS = ["Intelligenza Artificiale", "Linux & Open Source", "Gaming", "WordPress", "Produttività digitale"];
const PHASES = ["Scansione articoli esistenti...", "Analisi competitor italiani...", "Ricerca keyword e gap...", "Generazione idee articoli..."];

const DIFF_COLORS = { bassa: "badge-bassa", media: "badge-media", alta: "badge-alta" };
const INTENT_COLORS = { informazionale: "badge-bassa", transazionale: "badge-media", commerciale: "badge-alta", navigazionale: "badge-bassa" };
const KW_STATUS = { da_fare: { label: "da fare" }, in_lavorazione: { label: "in lavorazione" }, fatto: { label: "fatto ✓" } };
const ART_STATUS = { da_scrivere: { label: "da scrivere" }, in_lavorazione: { label: "in lavorazione" }, pubblicato: { label: "pubblicato ✓" } };

function prioritaToDiff(priority) {
  if (!priority) return "media";
  const p = priority.toLowerCase();
  if (p === "alta")   return "alta";
  if (p === "media")  return "media";
  return "bassa";
}

function decodeHTML(str) {
  if (!str) return "";
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

function topicToCat(topic) {
  if (!topic) return "ai";
  const t = topic.toLowerCase();
  if (t.includes("linux") || t.includes("open source")) return "linux";
  if (t.includes("gaming") || t.includes("game"))        return "gaming";
  if (t.includes("ai") || t.includes("chatgpt") || t.includes("llm")) return "ai";
  if (t.includes("wordpress") || t.includes("produttività")) return "tools";
  return "oss";
}

function Pill({ text, map }) {
  if (!text) return null;
  const className = map?.[text] || "badge-neutral";
  return <span className={`badge ${className}`}>{text}</span>;
}

function StatusCycle({ value, map, onChange }) {
  const keys = Object.keys(map);
  const curr = map[value] || map[keys[0]];
  function next() { const idx = keys.indexOf(value); onChange(keys[(idx + 1) % keys.length]); }
  return (
    <button onClick={next} className="badge badge-neutral" style={{ border: 'none', cursor: 'pointer' }}>
      {curr.label}
    </button>
  );
}

function SectionTable({ headers, rows }) {
  if (!rows?.length) return <div className="insights-box">Nessun dato disponibile per questa sezione.</div>;
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              {headers.map((h, i) => (
                <th key={i}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isChecked = row[0]?.props?.checked;
              return (
                <tr key={i} className={isChecked ? "row-completed" : ""}>
                  {row.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Firebase persistence replaces localStorage functions
// function loadAnalyses() {
//   try { return JSON.parse(localStorage.getItem("kr_analyses") || "[]"); } catch { return []; }
// }
// function saveAnalyses(list) { localStorage.setItem("kr_analyses", JSON.stringify(list)); }

async function exportCSV(analysis) {
  const XLSX = await loadXLSX();
  const newArts = (analysis.result.articles || []).filter(a => a.type === "nuovo");
  // const updArts = (analysis.result.articles || []).filter(a => a.type === "aggiornamento");
  const wb = XLSX.utils.book_new();

  const kwRows = [
    ["#", "Keyword", "Difficoltà", "Intento", "Volume stimato", "Stato"],
    ...(analysis.result.keywords || []).map((kw, i) => [
      i + 1, kw.keyword, kw.difficulty, kw.intent, kw.volume || "—",
      KW_STATUS[analysis.statuses?.keywords?.[i] || "da_fare"]?.label || "da fare"
    ])
  ];
  const wsKw = XLSX.utils.aoa_to_sheet(kwRows);
  XLSX.utils.book_append_sheet(wb, wsKw, "Keyword");

  const artRows = [
    ["#", "Titolo articolo", "Descrizione", "Keyword target", "Priorità", "Stato"],
    ...newArts.map((a, i) => [
      i + 1, a.title, a.description || "", (a.keywords || []).join(", "), a.priority,
      ART_STATUS[analysis.statuses?.articles_new?.[i] || "da_scrivere"]?.label || "da scrivere"
    ])
  ];
  const wsArt = XLSX.utils.aoa_to_sheet(artRows);
  XLSX.utils.book_append_sheet(wb, wsArt, "Nuovi articoli");

  XLSX.writeFile(wb, `keyword-research-${analysis.url}.xlsx`);
}

async function _exportWord(analysis) {
  // Same logic as before but with updated styles
  const html = `<html><body style="font-family: Arial;"><h1>${analysis.url}</h1></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `analysis.html`;
  link.click();
}

export default function App() {
  const [view, setView] = useState("piano"); // Default to piano editoriale
  const [url, setUrl] = useState("cosmonet.info");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [customTopic, setCustomTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("articles");
  const [analyses, setAnalyses] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [pianoItems, setPianoItems] = useState([]);

  // Load piano articles to check for duplicates
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "piano_editoriale"), (snapshot) => {
      setPianoItems(snapshot.docs.map(d => ({ id: d.id, title: d.data().title })));
    });
    return () => unsubscribe();
  }, []);

  // Load analyses from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, "analyses"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAnalyses(list);
    });
    return () => unsubscribe();
  }, []);



  const [provider, setProvider] = useState("groq");

  const finalTopic = topic === "Personalizzato" ? customTopic : topic;
  const current = analyses.find(a => a.id === currentId) || (analyses.length > 0 ? analyses[0] : null);
  const result = current?.result;
  const newArticles = result?.articles?.filter(a => a.type === "nuovo") || [];
  const updateArticles = result?.articles?.filter(a => a.type === "aggiornamento") || [];

  async function updateCurrent(updater) {
    if (!current) return;
    const updatedData = updater(current);
    const { id: _id, ...data } = updatedData;
    await updateDoc(doc(db, "analyses", current.id), data);
  }

  function setKwStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, keywords: { ...(a.statuses?.keywords || {}), [i]: val } } })); }
  function setArtNewStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_new: { ...(a.statuses?.articles_new || {}), [i]: val } } })); }
  function setArtUpdStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_upd: { ...(a.statuses?.articles_upd || {}), [i]: val } } })); }

  async function addToPiano(article, tipo = "nuovo", silent = false) {
    // Deduplicazione: controlla se il titolo esiste già (case insensitive)
    const exists = pianoItems.some(p => p.title?.toLowerCase() === article.title?.toLowerCase());
    if (exists) {
      if (!silent) alert(`L'articolo "${article.title}" è già presente nel piano.`);
      return;
    }

    const cat  = topicToCat(finalTopic);
    const diff = prioritaToDiff(article.priority);
    const kw   = (article.keywords || []).join(", ");

    try {
      await addDoc(collection(db, "piano_editoriale"), {
        title:     article.title,
        kw:        kw,
        cat:       cat,
        diff:      diff,
        tipo:      tipo === "aggiornamento" ? "Aggiornamento" : "Articolo",
        month:     new Date().getMonth() + 1, // Mese corrente come default
        year:      new Date().getFullYear(),
        status:    "da_scrivere",
        source:    "keyword-researcher",
        sourceUrl: url,
        topic:     finalTopic,
        description: article.description || "",
        createdAt: serverTimestamp(),
      });
      if (!silent) alert(`✅ "${article.title}" aggiunto al Piano Editoriale!`);
    } catch (e) {
      console.error("Errore aggiunta piano:", e);
      if (!silent) alert("Errore durante l'aggiunta: " + e.message);
    }
  }

  async function addAllToPiano() {
    if (!newArticles.length) return;
    
    // Filtriamo quelli che già ci sono
    const existingTitles = new Set(pianoItems.map(p => p.title?.toLowerCase()));
    const toAdd = newArticles.filter(a => !existingTitles.has(a.title?.toLowerCase()));

    if (toAdd.length === 0) {
      alert("Tutti gli articoli sono già presenti nel Piano Editoriale.");
      return;
    }

    const count = toAdd.length;
    // Una sola conferma iniziale per l'operazione massiva
    if (!window.confirm(`Aggiungere i ${count} nuovi articoli al Piano Editoriale? (I duplicati verranno saltati)`)) return;
    
    setLoading(true); // Usiamo il loading globale per indicare l'attività
    let added = 0;
    for (const art of toAdd) {
      await addToPiano(art, "nuovo", true); // Esecuzione silenziosa
      added++;
    }
    setLoading(false);
    alert(`✅ Operazione completata: ${added} articoli aggiunti al Piano!`);
  }

  async function addExistingToPiano(articles) {
    if (!articles?.length) return;

    // Recupera i titoli già presenti nel piano per evitare duplicati
    const { getDocs, query: fsQuery, where } = await import("firebase/firestore");
    const existing = await getDocs(
      fsQuery(collection(db, "piano_editoriale"), where("source", "==", "cosmonet-esistente"))
    );
    const existingTitles = new Set(existing.docs.map(d => d.data().title?.toLowerCase()));

    let added = 0;
    for (const art of articles) {
      if (!art.title || existingTitles.has(art.title.toLowerCase())) continue;

      await addDoc(collection(db, "piano_editoriale"), {
        title:       art.title,
        kw:          art.topic || "",
        cat:         topicToCat(art.topic || finalTopic),
        diff:        "bassa",
        tipo:        "Esistente",
        month:       0,               // 0 = già pubblicato, fuori dai mesi
        status:      "pubblicato",
        source:      "cosmonet-esistente",
        sourceUrl:   art.url || "",
        topic:       art.topic || finalTopic,
        description: "",
        existingUrl: art.url || "",
        createdAt:   serverTimestamp(),
      });
      added++;
    }
    return added;
  }
  
  async function deleteAnalysis(id) { 
    await deleteDoc(doc(db, "analyses", id));
    if (currentId === id) setCurrentId(null); 
  }

  async function runResearch(overrideTopic, pianoId) {
    const targetTopic = overrideTopic || finalTopic;
    if (!url || !targetTopic) return;
    setLoading(true);
    setError("");
    setPhaseIndex(0);
    if (!pianoId) setView("new");

    try {
      setPhaseIndex(0);
      await new Promise(r => setTimeout(r, 400));
      setPhaseIndex(1);

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, finalTopic: targetTopic, provider }),
      });

      setPhaseIndex(2);
      if (!response.ok) {
        let errData = {};
        try { errData = await response.json(); } catch { /* ignore */ }
        throw new Error(errData.error || `Errore backend: ${response.status}`);
      }

      const text = await response.text();
      setPhaseIndex(3);
      let jsonStr = text.trim().replace(/```json|```/g, "").trim();
      const s = jsonStr.indexOf("{"), e = jsonStr.lastIndexOf("}");
      if (s !== -1 && e !== -1) jsonStr = jsonStr.slice(s, e + 1);

      const parsed = JSON.parse(jsonStr);
      const newAnalysis = { 
        date: new Date().toISOString(), 
        url, 
        topic: targetTopic, 
        result: parsed, 
        statuses: {} 
      };
      
      const docRef = await addDoc(collection(db, "analyses"), newAnalysis);
      setCurrentId(docRef.id);
      
      if (pianoId) {
        await updateDoc(doc(db, "piano_editoriale", pianoId), {
          analysisId: docRef.id,
          status: "in_lavorazione"
        });
      }

      setView("new");
      setActiveTab("articles");

      // Importa automaticamente gli articoli esistenti nel Piano come "pubblicato"
      if (parsed.existing_articles?.length) {
        addExistingToPiano(parsed.existing_articles);
      }
    } catch (e) {
      setError("Errore: " + e.message);
    } finally { setLoading(false); }
  }

  const tabs = [
    { key: "articles", label: "Nuovi articoli", count: newArticles.length },
    { key: "updates", label: "Da aggiornare", count: updateArticles.length },
    { key: "keywords", label: "Keyword", count: result?.keywords?.length || 0 },
    { key: "competitors", label: "Competitor", count: result?.competitors?.length || 0 },
    { key: "existing", label: "Esistenti", count: result?.existing_articles?.length || 0 },
  ];

  return (
    <div id="root">
      <header className="header-main" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40, borderBottom: '1px solid var(--color-border)', paddingBottom: 20 }}>
        <div>
          <h1>Keyword Researcher</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, margin: '4px 0 0' }}>
            Sito: <strong>{url}</strong> {view !== "piano" && <>· Nicchia: <strong>{finalTopic}</strong></>}
          </p>
        </div>
        <nav className="header-nav" style={{ display: 'flex', gap: 24 }}>
          <button onClick={() => startTransition(() => setView("history"))} style={{ background: 'none', border: 'none',
            color: view === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: view === 'history' ? 600 : 400, cursor: 'pointer' }}>
            Storico ({analyses.length})
          </button>
          <button onClick={() => startTransition(() => setView("piano"))} style={{ background: 'none', border: 'none',
            color: view === 'piano' ? 'var(--color-primary)' : 'var(--color-text-secondary)',
            fontWeight: view === 'piano' ? 600 : 400, cursor: 'pointer' }}>
            📅 Piano Editoriale
          </button>
          <button onClick={() => startTransition(() => setView("new"))} style={{ background: 'none', border: 'none', color: view === 'new' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: view === 'new' ? 600 : 400, cursor: 'pointer' }}>Analisi</button>
        </nav>
      </header>



      {view === "new" && (
        <main>
          <section className="card">
            <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Sito Web</label>
                <input value={url} onChange={e => setUrl(e.target.value)} placeholder="esempio.it" />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Nicchia / Argomento</label>
                <select value={topic} onChange={e => setTopic(e.target.value)}>
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                  <option value="Personalizzato">Personalizzato...</option>
                </select>
              </div>
            </div>
            {topic === "Personalizzato" && <input value={customTopic} onChange={e => setCustomTopic(e.target.value)} placeholder="Es: fotografia digitale..." style={{ marginBottom: 20 }} />}
            
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Motore di AI</label>
              <select value={provider} onChange={e => setProvider(e.target.value)}>
                <option value="groq">Groq (LLaMA 3.3 - Ultra veloce)</option>
                <option value="gemini">Google Gemini 2.0 Flash</option>
                <option value="claude">Anthropic Claude 3.5 Sonnet</option>
              </select>
            </div>

            <button onClick={() => runResearch()} disabled={loading} className="btn-primary" style={{ width: '100%' }}>
              {loading ? 'Analisi in corso...' : 'Avvia analisi completa ↗'}
            </button>
          </section>

          {loading && (
            <div className="insights-box">
               <div style={{ fontWeight: 600, marginBottom: 12 }}>Avanzamento:</div>
               {PHASES.map((p, i) => (
                 <div key={i} style={{ opacity: i <= phaseIndex ? 1 : 0.4, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
                   <div style={{ width: 8, height: 8, borderRadius: '50%', background: i < phaseIndex ? '#137333' : (i === phaseIndex ? 'var(--color-primary)' : '#dadce0') }}></div>
                   <span style={{ fontSize: 13 }}>{p}</span>
                 </div>
               ))}
            </div>
          )}

          {error && <div className="insights-box" style={{ background: '#fce8e6', borderLeftColor: '#c5221f', color: '#c5221f' }}>{error}</div>}

          {current && result && (
            <div style={{ marginTop: 40, animation: "fadeUp 0.3s ease" }}>
              {result.insights && <div className="insights-box">{result.insights}</div>}
              
              <div className="tabs-container" style={{ display: 'flex', gap: 32, borderBottom: '1px solid var(--color-border)', marginBottom: 24 }}>
                {tabs.map(t => (
                  <button key={t.key} onClick={() => setActiveTab(t.key)} style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: 14, fontWeight: activeTab === t.key ? 600 : 400, color: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-text-secondary)', borderBottom: activeTab === t.key ? '3px solid var(--color-primary)' : '3px solid transparent', cursor: 'pointer' }}>
                    {t.label} ({t.count})
                  </button>
                ))}
              </div>

              {activeTab === "articles" && newArticles.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
                  <button onClick={addAllToPiano}
                    style={{ padding: '6px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                      background: '#7c3aed', color: '#fff', border: 'none', cursor: 'pointer' }}>
                    📅 Aggiungi tutti al Piano ({newArticles.length})
                  </button>
                </div>
              )}

              {activeTab === "articles" && (
                <SectionTable
                  headers={["#", "Titolo Articolo", "Descrizione", "Keyword Target", "Priorità", "Stato"]}
                  rows={newArticles.map((a, i) => {
                    const exists = pianoItems.some(p => p.title?.toLowerCase() === a.title?.toLowerCase());
                    return [
                      i + 1,
                      <strong>{decodeHTML(a.title)}</strong>,
                      <span style={{ fontSize: 12, display: 'block', maxWidth: 400 }}>{a.description}</span>,
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(a.keywords || []).map(k => <span key={k} className="badge badge-neutral" style={{ background: '#e8f0fe', color: '#1a73e8' }}>{k}</span>)}</div>,
                      <Pill text={a.priority} map={DIFF_COLORS} />,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="checkbox"
                          checked={current.statuses?.articles_new?.[i] === "pubblicato"}
                          onChange={(e) => setArtNewStatus(i, e.target.checked ? "pubblicato" : "da_scrivere")}
                          style={{ width: 18, height: 18, cursor: 'pointer' }} />
                        <StatusCycle
                          value={current.statuses?.articles_new?.[i] || "da_scrivere"}
                          map={ART_STATUS}
                          onChange={v => setArtNewStatus(i, v)} />
                        <button
                          onClick={() => addToPiano(a, "nuovo")}
                          disabled={exists}
                          style={{ 
                            fontSize: 11, padding: '4px 10px', borderRadius: 6, 
                            border: exists ? '1px solid #ddd' : '1px solid #7c3aed',
                            background: exists ? '#f9fafb' : '#f5f3ff', 
                            color: exists ? '#9ca3af' : '#7c3aed', 
                            cursor: exists ? 'not-allowed' : 'pointer', 
                            whiteSpace: 'nowrap',
                            fontWeight: 600
                          }}>
                          {exists ? "✓ In Piano" : "+ Piano"}
                        </button>
                      </div>
                    ];
                  })}
                />
              )}

              {activeTab === "updates" && (
                <SectionTable
                  headers={["#", "Titolo", "Descrizione Aggiornamento", "URL Esistente", "Priorità", "Stato"]}
                  rows={updateArticles.map((a, i) => {
                    const exists = pianoItems.some(p => p.title?.toLowerCase() === a.title?.toLowerCase());
                    return [
                      i + 1,
                      <strong>{decodeHTML(a.title)}</strong>,
                      <span style={{ fontSize: 12, display: 'block', maxWidth: 400 }}>{a.update_reason || a.description}</span>,
                      <a href={a.existing_url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{a.existing_url}</a>,
                      <Pill text={a.priority} map={DIFF_COLORS} />,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <input 
                          type="checkbox" 
                          checked={current.statuses?.articles_upd?.[i] === "pubblicato"} 
                          onChange={(e) => setArtUpdStatus(i, e.target.checked ? "pubblicato" : "da_scrivere")}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <StatusCycle value={current.statuses?.articles_upd?.[i] || "da_scrivere"} map={ART_STATUS} onChange={v => setArtUpdStatus(i, v)} />
                        {exists && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>✓ In Piano</span>}
                      </div>
                    ];
                  })}
                />
              )}

              {activeTab === "keywords" && (
                <SectionTable
                  headers={["#", "Keyword", "Difficoltà", "Intento", "Volume Stimato", "Stato"]}
                  rows={result.keywords?.map((kw, i) => [
                    i + 1,
                    <strong>{kw.keyword}</strong>,
                    <Pill text={kw.difficulty} map={DIFF_COLORS} />,
                    <Pill text={kw.intent} map={INTENT_COLORS} />,
                    <span style={{ color: 'var(--color-text-secondary)' }}>{kw.volume || '~100/mese'}</span>,
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={current.statuses?.keywords?.[i] === "fatto"} 
                        onChange={(e) => setKwStatus(i, e.target.checked ? "fatto" : "da_fare")}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <StatusCycle value={current.statuses?.keywords?.[i] || "da_fare"} map={KW_STATUS} onChange={v => setKwStatus(i, v)} />
                    </div>
                  ])}
                />
              )}

              {activeTab === "competitors" && (
                <SectionTable
                  headers={["#", "Sito / Competitor", "URL", "Punto di Forza"]}
                  rows={result.competitors?.map((c, i) => [
                    i + 1,
                    <strong>{c.name}</strong>,
                    <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{c.url}</a>,
                    <span style={{ fontSize: 12 }}>{c.strength}</span>
                  ])}
                />
              )}

              {activeTab === "existing" && (
                <SectionTable
                  headers={["#", "Titolo", "Argomento", "URL", "Stato"]}
                  rows={result.existing_articles?.map((a, i) => {
                    const exists = pianoItems.some(p => p.title?.toLowerCase() === a.title?.toLowerCase());
                    return [
                      i + 1,
                      <strong>{decodeHTML(a.title)}</strong>,
                      <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.topic}</span>,
                      <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{a.url}</a>,
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Pill text={a.status === "aggiornare" ? "media" : "bassa"} map={DIFF_COLORS} />
                        {exists && <span style={{ fontSize: 10, color: '#10b981', fontWeight: 600 }}>✓ In Piano</span>}
                      </div>
                    ];
                  })}
                />
              )}

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                <button onClick={() => exportCSV(current)} style={{ background: '#f8f9fa', border: '1px solid #dadce0' }}>⬇ Excel (.xlsx)</button>
              </div>
            </div>
          )}
        </main>
      )}

      {view === "history" && (
        <main>
          <h2>Cronologia Ricerche</h2>
          <div className="card" style={{ padding: 0 }}>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Sito Analizzato</th>
                    <th>Nicchia</th>
                    <th>Keyword</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {analyses.length === 0 ? (
                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: 40 }}>Nessuna analisi salvata.</td></tr>
                  ) : (
                    analyses.map(a => (
                      <tr key={a.id}>
                        <td>{new Date(a.date).toLocaleDateString()}</td>
                        <td><strong>{a.url}</strong></td>
                        <td>{a.topic}</td>
                        <td><span className="badge badge-neutral">{a.result?.keywords?.length || 0}</span></td>
                        <td>
                          <div style={{ display: 'flex', gap: 12 }}>
                            <button onClick={() => { setCurrentId(a.id); setView("new"); }} style={{ border: 'none', background: 'none', color: 'var(--color-primary)', fontWeight: 600 }}>Apri</button>
                            <button onClick={() => { if (window.confirm("Eliminare?")) deleteAnalysis(a.id); }} style={{ border: 'none', background: 'none', color: '#c5221f' }}>Elimina</button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {view === "piano" && (
        <main>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ margin: 0 }}>📅 Piano Editoriale</h2>
            <span style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
              Sync real-time con Firestore · aggiornato in automatico
            </span>
          </div>
          <PianoEditoriale 
            onAnalyze={(title, id) => runResearch(title, id)} 
            onViewResults={(id) => { setCurrentId(id); setView("new"); }}
            loading={loading}
          />
        </main>
      )}
    </div>
  );
}
