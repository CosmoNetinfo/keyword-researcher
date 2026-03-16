import { useState, useEffect, startTransition, useMemo } from "react";
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
  getDoc,
  serverTimestamp
} from "firebase/firestore";
import PianoEditoriale from "./components/PianoEditoriale";
import Layout from "./components/Layout";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { 
  Search, 
  ExternalLink, 
  Calendar,
  CheckCircle2,
  BarChart3,
  Plus,
  RefreshCw,
  Clock,
  Check
} from "lucide-react";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

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

const TOPICS = ["Intelligenza Artificiale", "Open Source", "Gaming", "Linux", "WordPress"];
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

function SectionTable({ headers, rows, columnClasses }) {
  if (!rows?.length) return (
    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-12 text-center text-slate-400 font-medium">
      Nessun dato disponibile per questa sezione.
    </div>
  );
  
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-500/10 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-200">
              {headers.map((h, i) => (
                <th key={i} className={cn(
                  "px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest",
                  columnClasses?.[i]
                )}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row, i) => {
              const isChecked = row[0]?.props?.checked;
              return (
                <tr key={i} className={cn(
                  "transition-all hover:bg-slate-50/80",
                  isChecked && "bg-emerald-50/30"
                )}>
                  {row.map((cell, j) => (
                    <td key={j} className={cn(
                      "px-6 py-4",
                      columnClasses?.[j]
                    )}>
                      {cell}
                    </td>
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

  // FEAT 4: Dynamic Browser Tab Title
  useEffect(() => {
    const titles = {
      history: "Storico — cosmonet.info",
      new: "Analisi — cosmonet.info",
      piano: "Piano Editoriale — cosmonet.info"
    };
    document.title = titles[view] || "Keyword Researcher — cosmonet.info";
  }, [view]);

  // FEAT 5: Badge Articoli in Scadenza
  const dueCount = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    
    return pianoItems.filter(item => {
      if (item.status !== "da_scrivere") return false;
      const year = item.year || curYear;
      const month = item.month || curMonth;
      
      if (year < curYear) return true;
      if (year === curYear && month <= curMonth) return true;
      return false;
    }).length;
  }, [pianoItems]);

  // Load piano articles to check for duplicates
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "piano_editoriale"), (snapshot) => {
      setPianoItems(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
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

  const [wpCategories, setWPCategories] = useState([]);
  useEffect(() => {
    getDoc(doc(db, "config", "wordpress")).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.categories) setWPCategories(data.categories);
      }
    });
  }, []);



  const [provider, setProvider] = useState("groq");

  const finalTopic = topic === "Personalizzato" ? customTopic : topic;
  const current = analyses.find(a => a.id === currentId) || (analyses.length > 0 ? analyses[0] : null);
  const result = current?.result;
  const newArticles = result?.articles?.filter(a => a.type === "nuovo") || [];
  const updateArticles = result?.articles?.filter(a => a.type === "aggiornamento") || [];

  /* function updateCurrent(updater) {
    if (!current) return;
    const updatedData = updater(current);
    const { id: _id, ...data } = updatedData;
    updateDoc(doc(db, "analyses", current.id), data);
  } */

  /* Unused state setters removed to resolve lint errors */
  // function setKwStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, keywords: { ...(a.statuses?.keywords || {}), [i]: val } } })); }
  // function setArtNewStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_new: { ...(a.statuses?.articles_new || {}), [i]: val } } })); }
  // function setArtUpdStatus(i, val) { updateCurrent(a => ({ ...a, statuses: { ...a.statuses, articles_upd: { ...(a.statuses?.articles_upd || {}), [i]: val } } })); }

  async function addToPiano(article, tipo = "nuovo", silent = false) {
    // Deduplicazione: controlla se il titolo esiste già (case insensitive)
    const exists = pianoItems.some(p => p.title?.toLowerCase() === article.title?.toLowerCase());
    if (exists) {
      if (!silent) alert(`L'articolo "${article.title}" è già presente nel piano.`);
      return;
    }

    const cat = wpCategories.find(c => 
      c.name.toLowerCase().includes(finalTopic.toLowerCase()) || 
      finalTopic.toLowerCase().includes(c.name.toLowerCase())
    )?.slug || topicToCat(finalTopic);
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
    <Layout activeView={view} setView={setView} dueCount={dueCount}>



      {view === "new" && (
        <main className="max-w-[1000px] mx-auto">
          <section className="card-premium animate-fade-up border-slate-200/60 shadow-xl shadow-slate-200/40" style={{ marginBottom: 40 }}>
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                <Search className="text-indigo-600" size={20} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Nuova Ricerca Strategica</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Sito Web Target</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ExternalLink size={16} className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input 
                    value={url} 
                    onChange={e => setUrl(e.target.value)} 
                    placeholder="esempio.it" 
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-medium placeholder:text-slate-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Argomento / Nicchia</label>
                <select 
                  value={topic} 
                  onChange={e => setTopic(e.target.value)}
                  className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-bold focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none appearance-none cursor-pointer"
                >
                  {TOPICS.map(t => <option key={t}>{t}</option>)}
                  <option value="Personalizzato">Personalizzato...</option>
                </select>
              </div>
            </div>

            {topic === "Personalizzato" && (
              <div className="mb-8 animate-fade-up">
                <input 
                  value={customTopic} 
                  onChange={e => setCustomTopic(e.target.value)} 
                  placeholder="Es: Domotica per la casa, Fotografia Digitale..." 
                  className="w-full px-5 py-3.5 bg-indigo-50/30 border border-indigo-100 rounded-2xl text-indigo-900 font-bold placeholder:text-indigo-300 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all outline-none"
                />
              </div>
            )}
            
            <div className="space-y-2 mb-10">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest ml-1">Modello di Intelligenza Artificiale</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { id: 'groq', name: 'Groq LLaMA 3.3', speed: 'Ultra Veloce', color: 'indigo' },
                  { id: 'gemini', name: 'Google Gemini 2.0', speed: 'Smart & Link', color: 'emerald' },
                  { id: 'claude', name: 'Claude 3.5 Sonnet', speed: 'Qualità Massima', color: 'amber' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setProvider(p.id)}
                    className={cn(
                      "flex flex-col items-start p-4 rounded-2xl border-2 transition-all",
                      provider === p.id 
                        ? "bg-white border-indigo-600 shadow-md ring-4 ring-indigo-50" 
                        : "bg-slate-50 border-transparent hover:border-slate-200"
                    )}
                  >
                    <span className={cn("text-xs font-bold mb-1", provider === p.id ? "text-indigo-600" : "text-slate-600")}>{p.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{p.speed}</span>
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={() => runResearch()} 
              disabled={loading} 
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-2xl font-extrabold text-lg shadow-xl shadow-indigo-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  <span>Elaborazione Strategica...</span>
                </>
              ) : (
                <>
                  <span>Avvia Analisi Strategica</span>
                  <Search size={20} strokeWidth={3} />
                </>
              )}
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
              
              <div className="tabs-container" style={{ display: 'flex', gap: 32, borderBottom: '1px solid #e2e8f0', marginBottom: 32, overflowX: 'auto', whiteSpace: 'nowrap', paddingBottom: 2 }}>
                {tabs.map(t => (
                  <button key={t.key} onClick={() => startTransition(() => setActiveTab(t.key))} style={{ background: 'none', border: 'none', padding: '12px 0', fontSize: 14, fontWeight: activeTab === t.key ? 700 : 500, color: activeTab === t.key ? 'var(--color-primary)' : '#64748b', borderBottom: activeTab === t.key ? '3px solid var(--color-primary)' : '3px solid transparent', cursor: 'pointer', outline: 'none' }}>
                    {t.label} <span style={{ opacity: 0.6, fontSize: '0.8em', marginLeft: 4 }}>{t.count}</span>
                  </button>
                ))}
              </div>


              {activeTab === "articles" && newArticles.length > 0 && (
                <div className="animate-[fadeUp_0.3s_ease]">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                        <Plus className="text-indigo-600" size={18} />
                      </div>
                      Nuovi Contenuti Suggeriti
                    </h3>
                    <button onClick={() => startTransition(() => addAllToPiano())}
                            className="bg-electric-blue text-white px-6 py-2.5 rounded-2xl font-bold text-sm shadow-lg shadow-electric-blue/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2">
                       <Plus size={18} strokeWidth={3} /> Aggiungi tutti al Piano ({newArticles.length})
                    </button>
                  </div>
                  
                  <SectionTable
                    headers={["#", "Titolo Articolo", "Descrizione Strategica", "Keyword", "Diff", "Azioni"]}
                    columnClasses={["w-[50px] text-center font-bold text-slate-400", "w-[25%] font-bold text-slate-900", "w-[35%] text-slate-500 italic text-[13px] leading-relaxed", "w-[15%]", "w-[100px] text-center", "w-[180px] text-right"]}
                    rows={newArticles.map((a, i) => {
                      const exists = pianoItems.some(p => p.title?.toLowerCase() === a.title?.toLowerCase());
                      return [
                        i + 1,
                        decodeHTML(a.title),
                        a.description,
                        <div className="flex flex-wrap gap-1">{(a.keywords || []).slice(0, 3).map(k => <span key={k} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-bold border border-slate-200 uppercase">{k}</span>)}</div>,
                        <div className="flex justify-center"><Pill text={a.priority} map={DIFF_COLORS} /></div>,
                        <div className="flex items-center justify-end gap-3">
                          {exists ? (
                             <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-xl text-xs font-bold border border-emerald-100 italic">
                               <Check size={14} strokeWidth={3} /> In Piano
                             </div>
                          ) : (
                            <button onClick={() => startTransition(() => addToPiano(a, "nuovo"))}
                                    className="px-4 py-1.5 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:border-electric-blue hover:text-electric-blue transition-all shadow-sm">
                              + Aggiungi
                            </button>
                          )}
                        </div>
                      ];
                    })}
                  />
                </div>
              )}


              {activeTab === "updates" && (
                <div className="animate-[fadeUp_0.3s_ease]">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
                      <RefreshCw className="text-amber-600" size={18} />
                    </div>
                    Contenuti da Ottimizzare
                  </h3>
                  <SectionTable
                    headers={["#", "Pagina Corrente", "Strategia SEO", "Link", "Diff", "Azione"]}
                    columnClasses={["w-[50px] text-center font-bold text-slate-400", "w-[25%] font-bold text-slate-900", "w-[35%] text-slate-500 italic text-[13px] leading-relaxed", "w-[15%]", "w-[100px] text-center", "w-[180px] text-right"]}
                    rows={updateArticles.map((a, i) => {
                      return [
                        i + 1,
                        decodeHTML(a.title),
                        a.update_reason || a.description,
                        <a href={a.existing_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold border border-slate-200 hover:bg-white hover:text-electric-blue transition-all">
                          <ExternalLink size={12} /> Visita
                        </a>,
                        <div className="flex justify-center"><Pill text={a.priority} map={DIFF_COLORS} /></div>,
                        <div className="flex items-center justify-end">
                          <button onClick={() => startTransition(() => addToPiano(a, "aggiornare"))}
                                  className="px-4 py-1.5 bg-white text-slate-600 rounded-xl text-xs font-bold border border-slate-200 hover:border-electric-blue hover:text-electric-blue transition-all shadow-sm">
                            + Piano
                          </button>
                        </div>
                      ];
                    })}
                  />
                </div>
              )}


              {activeTab === "keywords" && (
                <div className="animate-[fadeUp_0.3s_ease]">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <Search className="text-indigo-600" size={18} />
                    </div>
                    Ricerca Keyword & Trend
                  </h3>
                  <SectionTable
                    headers={["#", "Parola Chiave", "AI Diff", "Real Diff", "Ads", "Intento", "Vol / Mese"]}
                    columnClasses={["w-[50px] text-center font-bold text-slate-400", "w-[25%] font-bold text-slate-900", "w-[15%] text-center", "w-[15%] text-center", "w-[10%] text-center", "w-[15%] text-center", "w-[15%] text-right font-mono text-[13px] text-slate-600"]}
                    rows={result.keywords?.map((kw, i) => [
                      i + 1,
                      kw.keyword,
                      <div className="flex justify-center"><Pill text={kw.difficulty} map={DIFF_COLORS} /></div>,
                      <div className="flex justify-center"><Pill text={kw.difficulty_real || kw.difficulty} map={DIFF_COLORS} /></div>,
                      <span className={cn("text-xs font-bold", kw.serper_ads > 2 ? "text-rose-500" : "text-slate-400")}>
                        {kw.serper_ads !== undefined ? `${kw.serper_ads} ads` : '—'}
                      </span>,
                      <div className="flex justify-center"><Pill text={kw.intent} map={INTENT_COLORS} /></div>,
                      kw.volume || '~100'
                    ])}
                  />
                </div>
              )}


              {activeTab === "competitors" && (
                <div className="animate-[fadeUp_0.3s_ease]">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
                      <BarChart3 className="text-rose-600" size={18} />
                    </div>
                    Analisi dei Competitor
                  </h3>
                  <SectionTable
                    headers={["#", "Sito / Competitor", "URL / Link Esterno", "Focus Strategico"]}
                    columnClasses={["w-[50px] text-center font-bold text-slate-400", "w-[25%] font-bold text-slate-900", "w-[30%] font-mono text-[11px]", "w-[40%] text-slate-500 text-[13px] leading-relaxed"]}
                    rows={result.competitors?.map((c, i) => [
                      i + 1,
                      c.name,
                      <a href={c.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold border border-slate-200 hover:bg-white hover:text-electric-blue transition-all">
                        <ExternalLink size={12} /> Visita Sito
                      </a>,
                      c.strength
                    ])}
                  />
                </div>
              )}

              {activeTab === "existing" && (
                <div className="animate-[fadeUp_0.3s_ease]">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 mb-6">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                      <CheckCircle2 className="text-emerald-600" size={18} />
                    </div>
                    Contenuti Già Pubblicati
                  </h3>
                  <SectionTable
                    headers={["#", "Titolo Pagina", "Argomento", "Link", "Stato SEO"]}
                    columnClasses={["w-[50px] text-center font-bold text-slate-400", "w-[40%] font-bold text-slate-900", "w-[20%] text-slate-400", "w-[15%]", "w-[150px] text-center"]}
                    rows={result.existing_articles?.map((a, i) => {
                      const exists = pianoItems.some(p => p.title?.toLowerCase() === a.title?.toLowerCase());
                      return [
                        i + 1,
                        decodeHTML(a.title),
                        a.topic,
                        <a href={a.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[11px] font-bold border border-slate-200 hover:bg-white hover:text-electric-blue transition-all">
                          <ExternalLink size={12} /> Apri
                        </a>,
                        <div className="flex flex-col items-center gap-1">
                          <Pill text={a.status === "aggiornare" ? "media" : "bassa"} map={DIFF_COLORS} />
                          {exists && <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-tighter">In Piano</span>}
                        </div>
                      ];
                    })}
                  />
                </div>
              )}

              <div className="flex justify-end mt-8">
                <button onClick={() => exportCSV(current)} className="bg-slate-50 text-slate-600 px-5 py-2 rounded-xl text-sm font-bold border border-slate-200 hover:bg-slate-100 transition-all flex items-center gap-2">
                  <BarChart3 size={16} /> Esporta Risultati (.xlsx)
                </button>
              </div>

            </div>
          )}
        </main>
      )}

      {view === "history" && (
        <main className="max-w-5xl mx-auto animate-[fadeUp_0.3s_ease]">
          <div className="flex justify-between items-center mb-10">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Cronologia Analisi</h2>
              <p className="text-slate-500 mt-1">Gestisci e consulta le tue ricerche SEO precedenti</p>
            </div>
          </div>

          <SectionTable
            headers={["Data", "Sito / Target", "Nicchia Analizzata", "Keyword Trovate", "Azioni"]}
            columnClasses={["w-[150px] text-slate-500", "w-[30%] font-bold text-slate-900", "w-[25%] font-medium text-slate-600", "w-[15%] text-center", "w-[200px] text-right"]}
            rows={analyses.length === 0 ? [] : analyses.map(a => [
              new Date(a.date).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' }),
              <div className="flex flex-col">
                <span className="font-bold">{a.url}</span>
              </div>,
              a.topic,
              <div className="flex justify-center"><span className="px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold border border-indigo-100">{a.result?.keywords?.length || 0}</span></div>,
              <div className="flex justify-end gap-3">
                <button onClick={() => startTransition(() => { setCurrentId(a.id); setView("new"); })} 
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Apri Analisi">
                  <Search size={18} />
                </button>
                <button onClick={() => { if (window.confirm("Eliminare definitivamente?")) deleteAnalysis(a.id); }} 
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-all" title="Elimina">
                  <Plus size={18} className="rotate-45" />
                </button>
              </div>
            ])}
          />
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
            onViewResults={(id) => startTransition(() => { setCurrentId(id); setView("new"); })}
            loading={loading}
          />
        </main>
      )}
    </Layout>
  );
}
