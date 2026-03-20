import { useState, useEffect, useMemo } from "react";
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
import TrendMonitor from "./components/TrendMonitor";
import GSCInsights from "./components/GSCInsights";
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
  Check,
  Trash2,
  History,
  X
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

console.log("App component initialization started");
export default function App() {
  console.log("App function executing");
  const [view, setView] = useState("new"); // Debuuging: default to new
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
  const [importedKeywords, setImportedKeywords] = useState([]);

  // FEAT 4: Dynamic Browser Tab Title
  useEffect(() => {
    const titles = {
      history: "Cronologia — cosmonet.info",
      new:     "Analisi — cosmonet.info",
      trend:   "Trend Monitor — cosmonet.info",
      piano:   "Piano Editoriale — cosmonet.info"
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

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    try {
      const XLSX = await loadXLSX();
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Extract keywords from the first column of each row
        const kws = data
          .map(row => row[0])
          .filter(val => typeof val === 'string' && val.trim() !== '')
          .map(val => val.trim());

        if (kws.length === 0) {
          alert("Nessuna keyword valida trovata nel file.");
        } else {
          const limitedKws = kws.slice(0, 50);
          setImportedKeywords(limitedKws);
          if (kws.length > 50) {
            alert(`Caricate le prime 50 keyword (su ${kws.length} trovate).`);
          } else {
            alert(`Caricate ${kws.length} keyword con successo.`);
          }
        }
        setLoading(false);
      };
      reader.readAsBinaryString(file);
    } catch (err) {
      console.error("Errore caricamento file:", err);
      alert("Errore durante il caricamento del file.");
      setLoading(false);
    }
    // Reset input
    e.target.value = '';
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
        body: JSON.stringify({ url, finalTopic: targetTopic, provider, customKeywords: importedKeywords }),
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
      {view === "history" && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Cronologia Analisi</h1>
              <p className="text-slate-500 mt-1">Gestisci e consulta le tue ricerche strategiche passate</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {analyses.map((a) => (
              <div key={a.id} 
                onClick={() => { setCurrentId(a.id); setView("new"); }}
                className="group bg-white rounded-3xl p-6 shadow-sm border border-slate-200 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); if(confirm("Eliminare questa analisi?")) deleteAnalysis(a.id); }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 line-clamp-1">{a.topic}</h3>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">{a.url}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>{new Date(a.date).toLocaleDateString()}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-50">
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <div className="text-lg font-bold text-slate-900">{a.result?.keywords?.length || 0}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Keyword</div>
                  </div>
                  <div className="bg-slate-50 rounded-2xl p-3 text-center">
                    <div className="text-lg font-bold text-slate-900">{(a.result?.articles || []).filter(art => art.type === "nuovo").length}</div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Articoli</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === "trend" && (
        <TrendMonitor onAction={(topic) => { setCustomTopic(topic); setTopic("Personalizzato"); setView("new"); }} />
      )}

      {view === "piano" && (
        <PianoEditoriale onGenerateAnalysis={(topic, id) => {
          setUrl("cosmonet.info");
          setTopic("Personalizzato");
          setCustomTopic(topic);
          runResearch(topic, id);
        }} />
      )}

      {view === "gsc" && (
        <GSCInsights />
      )}

      {view === "new" && (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            
            <div className="relative z-10">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-6">
                <Search className="w-4 h-4" />
                AI Content Strategist
              </div>
              
              <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-4">
                Nuova Ricerca <span className="text-primary italic">Strategica</span>
              </h1>
              <p className="text-lg text-slate-500 max-w-2xl mb-12">
                Inserisci un dominio e un argomento per generare un'analisi SEO completa basata sui dati reali del mercato.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 ml-2 uppercase tracking-wider">Sito Web Target</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                      <ExternalLink className="h-5 w-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      className="block w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white text-slate-900 text-lg rounded-3xl transition-all outline-none"
                      placeholder="es. cosmonet.info"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-bold text-slate-700 ml-2 uppercase tracking-wider">Argomento Principale</label>
                  <div className="flex gap-3">
                    <select
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="block flex-1 pl-6 pr-12 py-5 bg-slate-50 border-2 border-transparent focus:border-primary/20 focus:bg-white text-slate-900 text-lg rounded-3xl transition-all outline-none appearance-none"
                    >
                      {TOPICS.map(t => <option key={t} value={t}>{t}</option>)}
                      <option value="Personalizzato">Altro...</option>
                    </select>
                  </div>
                </div>
              </div>

              {topic === "Personalizzato" && (
                <div className="mt-8 animate-in zoom-in-95 duration-300">
                  <input
                    type="text"
                    value={customTopic}
                    onChange={(e) => setCustomTopic(e.target.value)}
                    className="block w-full px-8 py-5 bg-slate-50 border-2 border-primary/10 focus:border-primary/30 focus:bg-white text-slate-900 text-lg rounded-3xl transition-all outline-none"
                    placeholder="Esempio: Strategie SEO per il 2024"
                  />
                </div>
              )}

              <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-8 pt-12 border-t border-slate-100">
                <div className="flex items-center gap-6">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Modello AI</span>
                    <div className="flex p-1.5 bg-slate-100 rounded-2xl">
                      <button 
                        onClick={() => setProvider("groq")}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          provider === "groq" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >Groq (Llama 3)</button>
                      <button 
                        onClick={() => setProvider("gemini")}
                        className={cn(
                          "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          provider === "gemini" ? "bg-white text-primary shadow-sm" : "text-slate-500 hover:text-slate-700"
                        )}
                      >Gemini 2.0</button>
                    </div>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Importa Keyword (CSV/XLSX)</span>
                    <div className="flex items-center gap-3">
                      <label 
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-2",
                          importedKeywords.length > 0 
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                            : "bg-slate-100 text-slate-500 border-transparent hover:bg-slate-200"
                        )}
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {importedKeywords.length > 0 ? `${importedKeywords.length} Keyword Caricate` : "Carica File"}
                        <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleFileUpload} />
                      </label>
                      {importedKeywords.length > 0 && (
                        <button 
                          onClick={() => setImportedKeywords([])}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Rimuovi keyword"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  disabled={loading || !url || (topic === "Personalizzato" && !customTopic)}
                  onClick={() => runResearch()}
                  className={cn(
                    "relative group overflow-hidden px-10 py-5 rounded-[2rem] font-bold text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto",
                    "bg-primary text-white shadow-xl shadow-primary/30 hover:shadow-2xl hover:shadow-primary/40"
                  )}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-500"></div>
                  <div className="relative flex items-center justify-center gap-3">
                    {loading ? (
                      <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        <span>Analisi in corso...</span>
                      </>
                    ) : (
                      <>
                        <span>Avvia Analisi Strategica</span>
                        <Search className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </div>
                </button>
              </div>

              {loading && (
                <div className="mt-8 space-y-4 animate-in fade-in zoom-in-95 duration-500">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-primary font-bold">{PHASES[phaseIndex]}</span>
                    <span className="text-slate-400 text-sm font-medium">{Math.round(((phaseIndex + 1) / PHASES.length) * 100)}%</span>
                  </div>
                  <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden p-1">
                    <div 
                      className="h-full bg-primary rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(37,99,235,0.4)]"
                      style={{ width: `${((phaseIndex + 1) / PHASES.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {error && (
                <div className="mt-8 p-6 bg-red-50 border border-red-100 text-red-600 rounded-3xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-300">
                  <div className="w-10 h-10 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                    <X className="w-5 h-5" />
                  </div>
                  <p className="font-bold">{error}</p>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
              {/* Header Risultati */}
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Risultati dell'Analisi</h2>
                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-100">
                      Successo
                    </span>
                  </div>
                  <p className="text-slate-500 font-medium">Strategia generata per <span className="text-primary">{current.url}</span> su <span className="font-bold text-slate-700">{current.topic}</span></p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button onClick={() => exportCSV(current)} className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
                    <ExternalLink className="w-4 h-4" /> Esporta Excel
                  </button>
                  <button onClick={addAllToPiano} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white font-bold rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200">
                    <Plus className="w-4 h-4" /> Aggiungi Tutti al Piano
                  </button>
                </div>
              </div>

              {/* Tabs Moderni */}
              <div className="px-4">
                <div className="flex p-2 bg-slate-100/80 backdrop-blur-sm rounded-[2rem] border border-slate-200/50 w-full overflow-x-auto no-scrollbar">
                  {tabs.map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        "flex items-center gap-3 px-8 py-4 rounded-[1.5rem] font-bold text-sm transition-all whitespace-nowrap",
                        activeTab === tab.key 
                          ? "bg-white text-primary shadow-md shadow-slate-200" 
                          : "text-slate-500 hover:text-slate-900"
                      )}
                    >
                      {tab.label}
                      <span className={cn(
                        "px-2 py-0.5 rounded-lg text-[10px]",
                        activeTab === tab.key ? "bg-primary/10 text-primary" : "bg-slate-200 text-slate-500"
                      )}>{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenuto Tab */}
              <div className="space-y-8 px-4">
                {activeTab === "articles" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {newArticles.map((art, i) => (
                      <div key={i} className="group bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm hover:shadow-xl hover:shadow-slate-200/40 hover:border-primary/20 transition-all duration-500 relative flex flex-col">
                        <div className="flex items-start justify-between mb-6">
                          <Pill text={art.priority} map={DIFF_COLORS} />
                          <button 
                            onClick={() => addToPiano(art, "nuovo")}
                            className="p-3 bg-slate-50 text-slate-400 rounded-2xl hover:bg-emerald-500 hover:text-white transition-all shadow-inner group-hover:scale-110"
                          >
                            <Plus className="w-5 h-5" />
                          </button>
                        </div>
                        <h3 className="text-xl font-black text-slate-900 mb-3 leading-tight group-hover:text-primary transition-colors">{art.title}</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6 flex-grow">{art.description}</p>
                        <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-50">
                          {art.keywords?.map(k => (
                            <span key={k} className="px-3 py-1.5 bg-slate-50 text-slate-600 text-[10px] font-bold rounded-xl border border-slate-100 flex items-center gap-1.5">
                              <Search className="w-3 h-3 text-slate-300" /> {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "updates" && (
                  <SectionTable 
                    headers={["Articolo", "Keyword", "Diff.", "Azioni"]}
                    columnClasses={["w-1/2", "w-1/4", "w-1/8", "w-1/8 text-right"]}
                    rows={updateArticles.map((art) => [
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 group-hover:text-primary transition-colors">{art.title}</span>
                        <span className="text-[10px] text-slate-400 font-medium uppercase mt-1">Slug: {art.slug || '—'}</span>
                      </div>,
                      <div className="flex flex-wrap gap-1">
                        {art.keywords?.map(k => <span key={k} className="text-[10px] text-slate-500 bg-slate-50 px-2 py-0.5 rounded-lg border border-slate-100">{k}</span>)}
                      </div>,
                      <Pill text={art.priority} map={DIFF_COLORS} />,
                      <button onClick={() => addToPiano(art, "aggiornamento")} className="p-2 text-primary hover:bg-primary/10 rounded-xl transition-all">
                        <Plus className="w-5 h-5" />
                      </button>
                    ])}
                  />
                )}

                {activeTab === "keywords" && (
                  <SectionTable 
                    headers={["Keyword", "Volume", "Intento", "Difficoltà", "AdWords", "Real Diff."]}
                    columnClasses={["w-1/3 font-bold", "w-1/12", "w-1/6", "w-1/6", "w-1/12", "w-1/12"]}
                    rows={(result.keywords || []).map((kw) => [
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary/40"></div>
                        {kw.keyword}
                      </div>,
                      <span className="font-mono text-xs font-bold text-slate-600">{kw.volume || "—"}</span>,
                      <Pill text={kw.intent} map={INTENT_COLORS} />,
                      <Pill text={kw.difficulty} map={DIFF_COLORS} />,
                      <span className="text-xs text-slate-500">{kw.cpc ? `$${kw.cpc}` : "—"}</span>,
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          "w-12 h-2 rounded-full bg-slate-100 overflow-hidden",
                        )}>
                          <div className={cn(
                            "h-full rounded-full",
                            kw.real_difficulty > 60 ? "bg-red-500" : kw.real_difficulty > 30 ? "bg-amber-500" : "bg-emerald-500"
                          )} style={{ width: `${kw.real_difficulty || 0}%` }}></div>
                        </div>
                        <span className="text-[10px] font-bold">{kw.real_difficulty || "—"}</span>
                      </div>
                    ])}
                  />
                )}

                {activeTab === "competitors" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(result.competitors || []).map((c, i) => (
                      <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all group">
                        <div className="flex items-center justify-between mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-all">
                            <ExternalLink className="w-6 h-6" />
                          </div>
                          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">#{i+1} Competitor</span>
                        </div>
                        <h3 className="font-black text-slate-900 mb-1 truncate">{c.url}</h3>
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-tight mb-4">{c.domain}</p>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Rilevanza</span>
                            <span className="font-bold text-slate-900">{c.relevance}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${c.relevance}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === "existing" && (
                  <SectionTable 
                    headers={["Articolo", "URL", "Argomento", "Data"]}
                    columnClasses={["w-1/2", "w-1/4", "w-1/8", "w-1/8"]}
                    rows={(result.existing_articles || []).map((art) => [
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{art.title}</span>
                      </div>,
                      <a href={art.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 text-sm">
                        Apri <ExternalLink className="w-3 h-3" />
                      </a>,
                      <span className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg">{art.topic || "N/A"}</span>,
                      <span className="text-xs text-slate-400">{art.date || "N/A"}</span>
                    ])}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
