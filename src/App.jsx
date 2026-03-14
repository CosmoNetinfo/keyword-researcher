import { useState, useEffect } from "react";
import { db } from "./firebase";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  doc, 
  deleteDoc 
} from "firebase/firestore";

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

const TOPICS = ["AI & ChatGPT", "Linux & Open Source", "Gaming", "WordPress", "Produttività digitale"];
const PHASES = ["Scansione articoli esistenti...", "Analisi competitor italiani...", "Ricerca keyword e gap...", "Generazione idee articoli..."];

const DIFF_COLORS = { bassa: "badge-bassa", media: "badge-media", alta: "badge-alta" };
const INTENT_COLORS = { informazionale: "badge-bassa", transazionale: "badge-media", commerciale: "badge-alta", navigazionale: "badge-bassa" };
const KW_STATUS = { da_fare: { label: "da fare" }, in_lavorazione: { label: "in lavorazione" }, fatto: { label: "fatto ✓" } };
const ART_STATUS = { da_scrivere: { label: "da scrivere" }, in_lavorazione: { label: "in lavorazione" }, pubblicato: { label: "pubblicato ✓" } };

// Editorial Plan Seeding Data
const INITIAL_PIANO = [
  { month: "1", title: "Claude vs ChatGPT vs Gemini: confronto completo 2025", category: "AI", keyword: "claude vs chatgpt italiano", difficulty: "alta", type: "Confronto" },
  { month: "1", title: "Come usare Ollama per far girare LLM in locale su Linux", category: "AI", keyword: "ollama linux guida", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "DeepSeek R2: tutto quello che devi sapere", category: "AI", keyword: "deepseek r2 recensione", difficulty: "media", type: "Recensione" },
  { month: "1", title: "I migliori modelli AI open source del 2025", category: "AI", keyword: "modelli AI open source 2025", difficulty: "media", type: "Listicle" },
  { month: "1", title: "Come installare e usare LM Studio su Ubuntu", category: "AI", keyword: "lm studio ubuntu", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "Stable Diffusion su Linux: guida all'installazione", category: "AI", keyword: "stable diffusion linux guida", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "Cos'è RAG (Retrieval Augmented Generation) spiegato semplicemente", category: "AI", keyword: "rag intelligenza artificiale spiegato", difficulty: "media", type: "Guida" },
  { month: "1", title: "Mistral AI: il modello europeo che sfida OpenAI", category: "AI", keyword: "mistral AI italiano", difficulty: "media", type: "Approfondimento" },
  { month: "1", title: "Come creare un chatbot AI gratis con Flowise", category: "AI", keyword: "flowise chatbot open source", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "Llama 3 vs Mistral: quale scegliere per uso locale", category: "AI", keyword: "llama 3 vs mistral confronto", difficulty: "media", type: "Confronto" },
  { month: "1", title: "ComfyUI: guida completa per generare immagini AI su Linux", category: "AI", keyword: "comfyui linux tutorial", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "Open WebUI: interfaccia grafica per Ollama, guida setup", category: "AI", keyword: "open webui ollama setup", difficulty: "bassa", type: "Tutorial" },
  { month: "1", title: "Agenti AI: cosa sono e come funzionano nel 2025", category: "AI", keyword: "agenti AI spiegazione 2025", difficulty: "media", type: "Guida" },
  { month: "1", title: "I migliori strumenti AI gratuiti per la produttività", category: "AI", keyword: "strumenti AI gratuiti produttività", difficulty: "alta", type: "Listicle" },
  { month: "1", title: "Come usare l'AI per scrivere codice: guida pratica", category: "AI", keyword: "AI scrivere codice guida", difficulty: "media", type: "Guida" }
];

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
  const [pianoArticles, setPianoArticles] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  
  // Piano Filters
  const [pianoMonth, setPianoMonth] = useState("1");
  const [pianoCategory, setPianoCategory] = useState("Tutti");
  const [pianoSearch, setPianoSearch] = useState("");

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

  // Load piano editoriale from Firestore in real-time
  useEffect(() => {
    const q = query(collection(db, "piano_editoriale"), orderBy("month", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPianoArticles(list);
    });
    return () => unsubscribe();
  }, []);

  // Seed logic if empty
  async function seedInitialPiano() {
    setLoading(true);
    try {
      for (const item of INITIAL_PIANO) {
        await addDoc(collection(db, "piano_editoriale"), {
          ...item,
          status: "da_scrivere",
          analysisId: null,
          completed: false,
          createdAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error("Error seeding piano:", e);
    } finally {
      setLoading(false);
    }
  }

  const [provider, setProvider] = useState("groq");

  const finalTopic = topic === "Personalizzato" ? customTopic : topic;
  const current = analyses.find(a => a.id === currentId) || (analyses.length > 0 ? analyses[0] : null);
  const result = current?.result;
  const newArticles = result?.articles?.filter(a => a.type === "nuovo") || [];
  const updateArticles = result?.articles?.filter(a => a.type === "aggiornamento") || [];

  async function togglePianoCompleted(id, val) {
    await updateDoc(doc(db, "piano_editoriale", id), { completed: val });
  }

  async function setPianoStatus(id, val) {
    await updateDoc(doc(db, "piano_editoriale", id), { status: val });
  }

  async function updateCurrent(updater) {
    if (!current) return;
    const updatedData = updater(current);
    const { id: _id, ...data } = updatedData;
    await updateDoc(doc(db, "analyses", current.id), data);
  }

  function setKwStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, keywords: { ...(a.statuses?.keywords || {}), [i]: val } } })); }
  function setArtNewStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_new: { ...(a.statuses?.articles_new || {}), [i]: val } } })); }
  function setArtUpdStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_upd: { ...(a.statuses?.articles_upd || {}), [i]: val } } })); }
  
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

  const filteredPiano = pianoArticles.filter(a => {
    const matchMonth = pianoMonth === "Tutti" || a.month === pianoMonth;
    const matchCategory = pianoCategory === "Tutti" || a.category === pianoCategory;
    const matchSearch = !pianoSearch || a.title.toLowerCase().includes(pianoSearch.toLowerCase()) || a.keyword.toLowerCase().includes(pianoSearch.toLowerCase());
    return matchMonth && matchCategory && matchSearch;
  });

  const categories = ["Tutti", ...new Set(pianoArticles.map(a => a.category))];

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
          <button onClick={() => setView("piano")} style={{ background: 'none', border: 'none', color: view === 'piano' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: view === 'piano' ? 600 : 400 }}>Piano Editoriale</button>
          <button onClick={() => setView("new")} style={{ background: 'none', border: 'none', color: view === 'new' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: view === 'new' ? 600 : 400 }}>Analisi</button>
          <button onClick={() => setView("history")} style={{ background: 'none', border: 'none', color: view === 'history' ? 'var(--color-primary)' : 'var(--color-text-secondary)', fontWeight: view === 'history' ? 600 : 400 }}>Storico ({analyses.length})</button>
        </nav>
      </header>

      {view === "piano" && (
        <main>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20, marginBottom: 32 }}>
             <div className="card" style={{ padding: '20px', background: '#202124', color: 'white' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{pianoArticles.length || 210}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Articoli totali</div>
             </div>
             <div className="card" style={{ padding: '20px', background: '#3c4043', color: 'white' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{pianoArticles.filter(a => a.category === "AI").length || 60}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>AI</div>
             </div>
             <div className="card" style={{ padding: '20px', background: '#3c4043', color: 'white' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>{pianoArticles.filter(a => a.category === "Linux").length || 60}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Linux</div>
             </div>
             <div className="card" style={{ padding: '20px', background: '#3c4043', color: 'white' }}>
                <div style={{ fontSize: 32, fontWeight: 700 }}>63%</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>KW difficoltà bassa</div>
             </div>
          </div>

          <div className="card" style={{ padding: 20, marginBottom: 24 }}>
             <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20 }}>
                <div>
                   <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Mese</label>
                   <select value={pianoMonth} onChange={e => setPianoMonth(e.target.value)} style={{ width: '100%' }}>
                      <option value="Tutti">Tutti i mesi</option>
                      <option value="1">Mese 1</option>
                      <option value="2">Mese 2</option>
                      <option value="3">Mese 3</option>
                   </select>
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Categoria</label>
                   <select value={pianoCategory} onChange={e => setPianoCategory(e.target.value)} style={{ width: '100%' }}>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                   </select>
                </div>
                <div>
                   <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8 }}>Cerca</label>
                   <input value={pianoSearch} onChange={e => setPianoSearch(e.target.value)} placeholder="Titolo o keyword..." style={{ width: '100%' }} />
                </div>
             </div>
          </div>

          <SectionTable 
            headers={["#", "Titolo Articolo", "Categoria", "Keyword Principale", "Difficoltà", "Tipo", "Azioni"]}
            rows={filteredPiano.map((a, i) => [
              i + 1,
              <div style={{ maxWidth: 300 }}>
                <strong>{a.title}</strong>
              </div>,
              <Pill text={a.category} />,
              <div style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.keyword}</div>,
              <Pill text={a.difficulty} map={DIFF_COLORS} />,
              <span style={{ fontSize: 12 }}>{a.type}</span>,
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                 <input 
                   type="checkbox" 
                   checked={a.completed} 
                   onChange={(e) => togglePianoCompleted(a.id, e.target.checked)}
                   style={{ width: 18, height: 18 }}
                 />
                 {a.analysisId ? (
                   <button onClick={() => { setCurrentId(a.analysisId); setView("new"); }} className="btn-primary" style={{ padding: '4px 12px', fontSize: 11 }}>Risultati</button>
                 ) : (
                   <button onClick={() => runResearch(a.title, a.id)} disabled={loading} style={{ background: 'none', border: '1px solid var(--color-primary)', color: 'var(--color-primary)', padding: '4px 12px', borderRadius: 4, fontSize: 11 }}>
                     {loading ? '...' : '🔍 Analizza'}
                   </button>
                 )}
              </div>
            ])}
          />
          
          {pianoArticles.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <button onClick={seedInitialPiano} className="btn-primary">Inizializza Piano Editoriale (210 Articoli)</button>
            </div>
          )}
        </main>
      )}

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

            <button onClick={runResearch} disabled={loading} className="btn-primary" style={{ width: '100%' }}>
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

              {activeTab === "articles" && (
                <SectionTable
                  headers={["#", "Titolo Articolo", "Descrizione", "Keyword Target", "Priorità", "Stato"]}
                  rows={newArticles.map((a, i) => [
                    i + 1,
                    <strong>{a.title}</strong>,
                    <span style={{ fontSize: 12, display: 'block', maxWidth: 400 }}>{a.description}</span>,
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{(a.keywords || []).map(k => <span key={k} className="badge badge-neutral" style={{ background: '#e8f0fe', color: '#1a73e8' }}>{k}</span>)}</div>,
                    <Pill text={a.priority} map={DIFF_COLORS} />,
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <input 
                        type="checkbox" 
                        checked={current.statuses?.articles_new?.[i] === "pubblicato"} 
                        onChange={(e) => setArtNewStatus(i, e.target.checked ? "pubblicato" : "da_scrivere")}
                        style={{ width: 18, height: 18, cursor: 'pointer' }}
                      />
                      <StatusCycle value={current.statuses?.articles_new?.[i] || "da_scrivere"} map={ART_STATUS} onChange={v => setArtNewStatus(i, v)} />
                    </div>
                  ])}
                />
              )}

              {activeTab === "updates" && (
                <SectionTable
                  headers={["#", "Titolo", "Descrizione Aggiornamento", "URL Esistente", "Priorità", "Stato"]}
                  rows={updateArticles.map((a, i) => [
                    i + 1,
                    <strong>{a.title}</strong>,
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
                    </div>
                  ])}
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
                  rows={result.existing_articles?.map((a, i) => [
                    i + 1,
                    <strong>{a.title}</strong>,
                    <span style={{ fontSize: 12, color: 'var(--color-text-secondary)' }}>{a.topic}</span>,
                    <a href={a.url} target="_blank" rel="noreferrer" style={{ fontSize: 11 }}>{a.url}</a>,
                    <Pill text={a.status === "aggiornare" ? "media" : "bassa"} map={DIFF_COLORS} />
                  ])}
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
    </div>
  );
}
