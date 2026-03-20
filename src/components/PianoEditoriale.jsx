import { useState, useEffect, startTransition, useMemo } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc,
  getDoc,
} from "firebase/firestore";
import { 
  Plus, 
  Search, 
  RefreshCw, 
  Trash2, 
  ExternalLink, 
  Edit3, 
  BarChart3, 
  AlertTriangle,
  FileText,
  Calendar,
  CheckCircle2,
  MoreVertical,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// ─── Costanti ────────────────────────────────────────────────────────────────

const CAT_META = {
  ai:      { label: "AI",          color: "text-violet-600", bg: "bg-violet-50", border: "border-violet-100" },
  linux:   { label: "Linux",       color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-100" },
  oss:     { label: "Open Source", color: "text-sky-600", bg: "bg-sky-50", border: "border-sky-100" },
  gaming:  { label: "Gaming",      color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
  tools:   { label: "Tools",       color: "text-pink-600", bg: "bg-pink-50", border: "border-pink-100" },
  news:    { label: "News",        color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
};

const DIFF_META = {
  bassa:  { label: "Bassa",  color: "text-emerald-600", bg: "bg-emerald-50" },
  media:  { label: "Media",  color: "text-amber-600", bg: "bg-amber-50" },
  alta:   { label: "Alta",   color: "text-rose-600", bg: "bg-rose-50" },
};

const MONTH_NAMES = [
  "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
  "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
];

const STATUS_META = {
  da_scrivere:   { label: "Da scrivere",   next: "in_lavorazione", color: "text-slate-500", bg: "bg-slate-100" },
  in_lavorazione:{ label: "In corso",      next: "programmato",    color: "text-blue-600", bg: "bg-blue-50" },
  programmato:   { label: "Programmato",   next: "pubblicato",     color: "text-amber-600", bg: "bg-amber-50" },
  pubblicato:    { label: "Pubblicato",    next: "da_scrivere",    color: "text-emerald-600", bg: "bg-emerald-50" },
};

function decodeHTML(str) {
  if (!str) return "";
  const txt = document.createElement('textarea');
  txt.innerHTML = str;
  return txt.value;
}

// ─── Utility per Similitudine ───────────────────────────────────────────────
function getTokens(str) {
  if (!str) return [];
  // Stop words italiane comuni
  const stopWords = new Set(["il", "lo", "la", "i", "gli", "le", "un", "una", "uno", "di", "a", "da", "in", "con", "su", "per", "tra", "fra", "e", "o", "che", "non", "del", "al", "ai", "come", "perche", "quando", "dove"]);
  return str.toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w));
}

function calculateSimilarity(s1, s2) {
  const tokens1 = new Set(getTokens(s1));
  const tokens2 = new Set(getTokens(s2));
  if (tokens1.size === 0 || tokens2.size === 0) return 0;
  
  const intersection = new Set([...tokens1].filter(x => tokens2.has(x)));
  // Sørensen–Dice coefficient
  return (2 * intersection.size) / (tokens1.size + tokens2.size);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ text, meta, className }) {
  if (!text || !meta?.[text]) return null;
  const { label, color, bg, border } = meta[text];
  return (
    <span className={cn(
      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border",
      bg, color, border || "border-transparent",
      className
    )}>
      {label}
    </span>
  );
}

function StatusBtn({ status, onChange, className }) {
  const m = STATUS_META[status] || STATUS_META.da_scrivere;
  return (
    <button 
      onClick={onChange}
      className={cn(
        "inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold transition-all border border-transparent hover:scale-105 active:scale-95",
        m.bg, m.color,
        className
      )}
    >
      {m.label}
    </button>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function PianoEditoriale({ onAnalyze, onViewResults, loading: globalLoading }) {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter]     = useState({ year: "all", month: "all", cat: "all", status: "all", q: "" });
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ 
    title: "", kw: "", cat: "ai", diff: "bassa", tipo: "Tutorial", 
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [saving, setSaving]     = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState("table"); // "table" | "calendar"
  const [showWPSettings, setShowWPSettings] = useState(false);
  const [wpSettings, setWPSettings] = useState({ url: "", user: "", pass: "" });
  const [testingWP, setTestingWP] = useState(false);
  const [seoResult, setSEOResult] = useState(null);
  const [checkingSEO, setCheckingSEO] = useState(null); // article id
  const [suggestions, setSuggestions] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [duplicateWarnings, setDuplicateWarnings] = useState({});
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [showDuplicateReview, setShowDuplicateReview] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: "month", direction: "asc" }); // Default: per data (mese)
  const [wpCategories, setWPCategories] = useState([]);
  const [briefStatus, setBriefStatus] = useState({});

  const PER_PAGE = 50; // Come richiesto nel Fix 1

  // ── Carica articoli da Firestore in real-time ────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "piano_editoriale"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    // Carica impostazioni WP
    getDoc(doc(db, "config", "wordpress")).then((snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        setWPSettings(data);
        if (data.categories) setWPCategories(data.categories);
      }
    });

    return unsub;
  }, []);

  // FEAT 2: Shortcut Ricerca (Ctrl+K)
  useEffect(() => {
    const handleKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        const searchInput = document.getElementById("piano-search-input");
        if (searchInput) searchInput.focus();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  // ── Aggiorna status ──────────────────────────────────────────────────────
  async function cycleStatus(article) {
    const next = STATUS_META[article.status]?.next || "da_scrivere";
    await updateDoc(doc(db, "piano_editoriale", article.id), { status: next });
  }



  // ── Elimina articolo ─────────────────────────────────────────────────────
  async function deleteArticle(id) {
    if (!window.confirm("Eliminare questo articolo dal piano?")) return;
    await deleteDoc(doc(db, "piano_editoriale", id));
  }

  // ── Aggiungi articolo manuale ─────────────────────────────────────────────
  async function addArticle(e) {
    e.preventDefault();
    if (!form.title) return;

    // Controllo preventivo duplicati
    const normalizedNew = form.title.toLowerCase().trim();
    const existing = articles.find(a => a.title.toLowerCase().trim() === normalizedNew);
    if (existing) {
      if (!window.confirm(`⚠️ Esiste già un articolo con questo titolo esatto:\n"${existing.title}"\n\nVuoi aggiungerlo comunque?`)) {
        return;
      }
    }

    setSaving(true);
    await addDoc(collection(db, "piano_editoriale"), {
      ...form,
      status: "da_scrivere",
      source: "manuale",
      createdAt: serverTimestamp(),
    });
    setForm({ 
      title: "", kw: "", cat: "ai", diff: "bassa", tipo: "Tutorial", 
      month: new Date().getMonth() + 1,
      year: new Date().getFullYear()
    });
    setShowForm(false);
    setSaving(false);
  }

  // ── Controlla Duplicati ───────────────────────────────────────────────────
  function checkDuplicates() {
    setCheckingDuplicates(true);
    const warnings = {};
    
    // Filtriamo gli articoli: controlliamo solo quelli NON pubblicati
    const toCheck = articles.filter(a => a.status !== "pubblicato");
    
    for (let i = 0; i < toCheck.length; i++) {
        const a = toCheck[i];
        const titleA = (a.title || "").toLowerCase().trim();
        const kwA = (a.kw || "").toLowerCase().trim();

        for (let j = i + 1; j < toCheck.length; j++) {
            const b = toCheck[j];
            const titleB = (b.title || "").toLowerCase().trim();
            const kwB = (b.kw || "").toLowerCase().trim();

            let type = null;
            let score = 0;

            if (titleA === titleB && titleA !== "") {
                type = "duplicato";
            } else if (kwA === kwB && kwA !== "" && kwA !== "—") {
                type = "stessa_kw";
            } else {
                score = calculateSimilarity(titleA, titleB);
                if (score > 0.75) {
                    type = "simile";
                }
            }

            if (type) {
                // Assegna warning a entrambi
                warnings[a.id] = { type, relatedTitle: b.title, score };
                warnings[b.id] = { type, relatedTitle: a.title, score };
            }
        }
    }
    
    setDuplicateWarnings(warnings);
    setCheckingDuplicates(false);
    
    const count = Object.keys(warnings).length;
    if (count > 0) {
        setShowDuplicateReview(true);
    } else {
        alert("✅ Nessun duplicato o articolo troppo simile trovato!");
    }
  }

  async function bulkDeleteDuplicates() {
    const ids = Object.keys(duplicateWarnings);
    if (ids.length === 0) return;
    if (!window.confirm(`⚠️ Sei sicuro di voler eliminare tutti i ${ids.length} articoli con conflitti?\nQuesta operazione non è reversibile.`)) return;
    
    setSaving(true);
    try {
        const promises = ids.map(id => deleteDoc(doc(db, "piano_editoriale", id)));
        await Promise.all(promises);
        setDuplicateWarnings({});
        setShowDuplicateReview(false);
        alert("✅ Tutti gli articoli con conflitti sono stati eliminati.");
    } catch (e) {
        alert("Errore durante l'eliminazione bulk: " + e.message);
    } finally {
        setSaving(false);
    }
  }
  async function deleteGhostArticles() {
    // Troviamo gli articoli che l'app crede siano pubblicati/programmati 
    // ma che NON hanno un timestamp di sincronizzazione recente (es. ultimi 10 minuti)
    const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
    const ghosts = articles.filter(a => 
      (a.status === "pubblicato" || a.status === "programmato") && 
      (!a.lastSyncedAt || a.lastSyncedAt < tenMinutesAgo)
    );

    if (ghosts.length === 0) {
      alert("✅ Nessun articolo fantasma trovato. Tutti i dati sono allineati!");
      return;
    }

    const titles = ghosts.map(g => `- ${g.title} (${g.status})`).join("\n");
    if (!window.confirm(`⚠️ Trovati ${ghosts.length} articoli che non risultano più presenti sul sito (o sono nel cestino):\n\n${titles}\n\nVuoi eliminarli dall'applicazione per allineare i conteggi?`)) return;

    setSaving(true);
    try {
      const promises = ghosts.map(g => deleteDoc(doc(db, "piano_editoriale", g.id)));
      await Promise.all(promises);
      alert(`✅ Pulizia completata! Rimossi ${ghosts.length} articoli obsoleti.`);
    } catch (e) {
      alert("Errore durante la pulizia: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Sorting Logic ────────────────────────────────────────────────────────
  function toggleSort(key) {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  }

  // ── Aggiorna col sito (Feed RSS + WordPress API per programmati) ────────────────────────
  async function refreshFromSite() {
    // Funzione per pulire i titoli (rimuove entità HTML comuni e spazi extra)
    const cleanTitle = (t) => (t || "")
      .toLowerCase()
      .replace(/&#8211;|&#8212;/g, "-")
      .replace(/&#8216;|&#8217;|&#8220;|&#8221;/g, "'")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/[^\w\s]/g, "") 
      .trim();

    setRefreshing(true);
    try {
      let publishedFromWP = [];
      let wpError = null;

      // 1. Tenta il fetch da WordPress API se abbiamo le credenziali
      if (wpSettings.url && wpSettings.user && wpSettings.pass) {
        try {
          const resWP = await fetch("/api/wp-fetch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              wpUrl: wpSettings.url,
              username: wpSettings.user,
              appPassword: wpSettings.pass
            })
          });
          
          const contentTypeWP = resWP.headers.get("content-type");
          let dataWP = {};
          if (contentTypeWP && contentTypeWP.includes("application/json")) {
            dataWP = await resWP.json();
          } else {
            const raw = await resWP.text();
            throw new Error(`Risposta non valida dall'API (/api/wp-fetch). In locale assicurati di usare 'vercel dev' o verifica il file api/wp-fetch.js. Dettaglio: ${raw.substring(0, 50)}...`);
          }

          if (resWP.ok) {
            publishedFromWP = dataWP.posts || [];
            if (dataWP.categories) {
              setWPCategories(dataWP.categories);
              // Salva le categorie nella configurazione (opzionale se lo fai qui)
              updateDoc(doc(db, "config", "wordpress"), { categories: dataWP.categories });
            }
          } else {
            wpError = dataWP.error || "Errore sconosciuto";
            console.error("WP API Error:", wpError);
          }
        } catch (e) {
          wpError = e.message;
          console.warn("WP Fetch fallito:", e);
        }
      } else {
        wpError = "Configurazione incompleta";
      }

      const res = await fetch("/api/check-published");
      const contentTypePub = res.headers.get("content-type");
      let publishedPublic = [];
      
      if (contentTypePub && contentTypePub.includes("application/json")) {
        const dataPub = await res.json();
        publishedPublic = dataPub.published || [];
      } else {
        const raw = await res.text();
        console.warn("Chiamata check-published non ha restituito JSON (normale in ambiente dev locale):", raw.substring(0, 50));
      }
      
      if (!res.ok && publishedPublic.length === 0) throw new Error("Errore API refresh pubblico o ambiente locale");
      
      // Uniamo le liste evitando duplicati (usiamo il titolo come chiave)
      const allFound = [...publishedFromWP];
      for (const p of publishedPublic) {
        if (!allFound.find(f => cleanTitle(f.title) === cleanTitle(p.title))) {
          allFound.push(p);
        }
      }

      let countSynced = 0;
      let countImported = 0;
      
      // 3. Processiamo gli articoli trovati su WP/Sitemap
      const syncTimestamp = Date.now();
      
      // Mappa delle categorie per ID
      const catMap = {};
      wpCategories.forEach(c => { catMap[c.id] = c.slug; });

      for (const found of allFound) {
        const cleanFoundTitle = cleanTitle(found.title);
        
        // Cerchiamo se esiste già nel piano (Priorità: ID WP > URL > Titolo)
        let existing = articles.find(art => 
          (found.id && art.wpId === found.id) || 
          (found.url && art.existingUrl === found.url)
        );

        if (!existing) {
          existing = articles.find(art => {
            const cleanArtTitle = cleanTitle(art.title);
            return (cleanFoundTitle && cleanArtTitle) && (cleanFoundTitle.includes(cleanArtTitle) || cleanArtTitle.includes(cleanFoundTitle));
          });
        }

        if (!existing) {
          existing = articles.find(art => {
            const similarity = calculateSimilarity(cleanFoundTitle, cleanTitle(art.title));
            return similarity > 0.85;
          });
        }

        const isFuture = found.status === "future";
        const postDate = new Date(found.date);
        
        // Determiniamo la categoria (prendiamo la prima se presente)
        let importedCat = "news";
        if (found.categoryIds && found.categoryIds.length > 0) {
          const firstCatId = found.categoryIds[0];
          if (catMap[firstCatId]) importedCat = catMap[firstCatId];
        }

        const updateData = {
          title: found.title,
          existingUrl: found.url,
          wpId: found.id || null,
          status: isFuture ? "programmato" : "pubblicato",
          wpStatus: isFuture ? "programmato" : "online",
          scheduledDate: isFuture ? found.date : null,
          year: postDate.getFullYear(),
          month: postDate.getMonth() + 1,
          lastSyncedAt: syncTimestamp,
          cat: importedCat
        };

        if (existing) {
          await updateDoc(doc(db, "piano_editoriale", existing.id), updateData);
          countSynced++;
        } else {
          await addDoc(collection(db, "piano_editoriale"), {
            ...updateData,
            kw: "",
            diff: "bassa",
            tipo: "News/Review",
            source: "wp-import",
            createdAt: serverTimestamp(),
          });
          countImported++;
        }
      }

      const wpStatusMsg = !wpError 
        ? `\n(✅ WordPress API: trovati ${publishedFromWP.length} post)` 
        : `\n(⚠️ WordPress API: ${wpError})`;

      alert(`✅ Aggiornamento completato!\n- ${countSynced} articoli sincronizzati\n- ${countImported} nuovi articoli importati.${wpStatusMsg}`);
    } catch (e) {
      console.error(e);
      alert("Errore durante il refresh: " + e.message);
    } finally {
      setRefreshing(false);
    }
  }

  // ── Genera e Copia Brief SEO ──────────────────────────────────────────────
  async function handleCopyBrief(article) {
    setBriefStatus(prev => ({ ...prev, [article.id]: 'loading' }));
    try {
      const apiKey = import.meta.env.VITE_GROQ_API_KEY;
      if (!apiKey) throw new Error("Manca VITE_GROQ_API_KEY");

      const prompt = `Sei un editor SEO esperto di cosmonet.info, blog tech italiano.
Scrivi un brief dettagliato per un articolo su: ${article.title}

Testo narrativo in italiano di 150-250 parole che includa:
- Contesto e rilevanza dell'argomento nel 2026
- Struttura consigliata (sezioni chiave da trattare)
- Dati, statistiche o fatti tecnici specifici da includere
- Casi d'uso concreti per sviluppatori e utenti Linux
- Confronto con alternative/competitor se pertinente
- Conclusione con implicazioni future per il lettore

Scrivi SOLO il testo del brief. Inizia con "Scrivi un articolo...".`;

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
           model: "llama-3.3-70b-versatile",
           messages: [{ role: "user", content: prompt }],
           temperature: 0.3,
           max_tokens: 4000
        })
      });

      if (!response.ok) throw new Error("Errore API Groq");
      const data = await response.json();
      const text = data.choices[0]?.message?.content;
      if (!text) throw new Error("Nessun testo restituito");

      await navigator.clipboard.writeText(text);
      setBriefStatus(prev => ({ ...prev, [article.id]: 'success' }));
      setTimeout(() => {
        setBriefStatus(prev => ({ ...prev, [article.id]: null }));
      }, 2000);
    } catch (err) {
      console.error(err);
      setBriefStatus(prev => ({ ...prev, [article.id]: 'error' }));
      setTimeout(() => {
        setBriefStatus(prev => ({ ...prev, [article.id]: null }));
      }, 3000);
    }
  }

  // ── SEO Check ─────────────────────────────────────────────────────────────
  async function runSEOCheck(article) {
    if (!article.existingUrl) return;
    setCheckingSEO(article.id);
    try {
      const res = await fetch("/api/check-published", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: article.existingUrl, keyword: article.kw })
      });
      
      const contentTypeSEO = res.headers.get("content-type");
      if (contentTypeSEO && contentTypeSEO.includes("application/json")) {
        const data = await res.json();
        setSEOResult({ id: article.id, ...data });
      } else {
        throw new Error("Risposta non valida dall'API SEO Check (JSON atteso).");
      }
    } catch (e) {
      alert("Errore SEO Check: " + e.message);
    } finally {
      setCheckingSEO(null);
    }
  }

  // ── WordPress Draft ───────────────────────────────────────────────────────
  async function createWPDraft(article) {
    if (!wpSettings.url || !wpSettings.user || !wpSettings.pass) {
      setShowWPSettings(true);
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/wp-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpUrl: wpSettings.url,
          username: wpSettings.user,
          appPassword: wpSettings.pass,
          title: article.title,
          content: article.description || `Bozza creata per keyword: ${article.kw}`
        })
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Bozza creata con successo!");
        window.open(data.editLink, "_blank");
      } else {
        throw new Error(data.error);
      }
    } finally {
      setSaving(false);
    }
  }

  // FEAT 3: Export CSV
  function exportCSV() {
    const toExport = selectedIds.size > 0 
      ? articles.filter(a => selectedIds.has(a.id))
      : filtered;

    if (toExport.length === 0) return alert("Nessun dato da esportare");
    
    // Titolo, Categoria, Keyword, Priorità, Tipo, Mese, Anno, Stato
    const headers = ["Titolo", "Categoria", "Keyword", "Priorità", "Tipo", "Mese", "Anno", "Stato"];
    const rows = toExport.map(a => [
      `"${(a.title || "").replace(/"/g, '""')}"`,
      CAT_META[a.cat]?.label || a.cat || "",
      `"${(a.kw || "").replace(/"/g, '""')}"`,
      a.diff || "",
      a.tipo || "",
      a.month || "",
      a.year || "",
      STATUS_META[a.status]?.label || a.status || ""
    ]);
    
    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = selectedIds.size > 0 
      ? `selezione_piano_${selectedIds.size}_articoli.csv` 
      : `piano_editoriale_${new Date().toISOString().slice(0, 10)}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // FEAT 1: Azioni Bulk
  async function bulkUpdate(updates) {
    if (selectedIds.size === 0) return;
    setSaving(true);
    try {
      const promises = Array.from(selectedIds).map(id => 
        updateDoc(doc(db, "piano_editoriale", id), updates)
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      alert("✅ Aggiornamento completato!");
    } catch (e) {
      alert("Errore aggiornamento bulk: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  async function bulkDelete() {
    if (!window.confirm(`Eliminare ${selectedIds.size} articoli?`)) return;
    setSaving(true);
    try {
      const promises = Array.from(selectedIds).map(id => 
        deleteDoc(doc(db, "piano_editoriale", id))
      );
      await Promise.all(promises);
      setSelectedIds(new Set());
      alert("✅ Articoli eliminati!");
    } catch (err) {
      alert("Errore eliminazione: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Suggerimenti Link Interni ─────────────────────────────────────────────
  function showLinkSuggestions(article) {
    const published = articles.filter(a => a.status === "pubblicato" && a.id !== article.id);
    const kwWords = (article.kw || "").toLowerCase().split(/[\s,]+/).filter(w => w.length > 3);
    
    const suggested = published.filter(p => {
      const pText = (p.title + " " + p.kw).toLowerCase();
      return kwWords.some(w => pText.includes(w));
    }).slice(0, 5);

    setSuggestions({ article, items: suggested });
  }

  async function testWPConnection() {
    setTestingWP(true);
    try {
      const res = await fetch("/api/wp-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wpUrl: wpSettings.url,
          username: wpSettings.user,
          appPassword: wpSettings.pass
        })
      });
      const data = await res.json();
      if (res.ok) {
        let msg = "✅ Connessione riuscita! Trovati " + (data.posts?.length || 0) + " post.";
        if (data.warning) msg += "\n\n⚠️ NOTA: " + data.warning;
        alert(msg);
      } else {
        alert("❌ Errore: " + (data.error || "Impossibile connettersi"));
      }
    } catch (e) {
      alert("❌ Errore di rete: " + e.message);
    } finally {
      setTestingWP(false);
    }
  }

  async function saveWPSettings() {
    setSaving(true);
    try {
      await setDoc(doc(db, "config", "wordpress"), { ...wpSettings, categories: wpCategories });
      setShowWPSettings(false);
      alert("Impostazioni salvate nel database Firebase.");
    } catch (e) {
      alert("Errore nel salvataggio: " + e.message);
    } finally {
      setSaving(false);
    }
  }

  // ── Filtraggio e Ordinamento Memoizzato ───────────────────────────────────
  const filtered = useMemo(() => {
    let result = articles.filter(a => {
      const itemDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date();
      const itemYear = a.year || itemDate.getFullYear();
      const itemMonth = a.month || (itemDate.getMonth() + 1);

      const yOk  = filter.year   === "all" || String(itemYear) === filter.year;
      const mOk  = filter.month  === "all" || String(itemMonth) === filter.month;
      const cOk  = filter.cat    === "all" || a.cat    === filter.cat;
      const sOk  = filter.status === "all" || a.status === filter.status;
      const qOk  = !filter.q || a.title.toLowerCase().includes(filter.q.toLowerCase())
                             || (a.kw || "").toLowerCase().includes(filter.q.toLowerCase());
      return yOk && mOk && cOk && sOk && qOk;
    });

    // Ordinamento
    result.sort((a, b) => {
      let valA, valB;

      if (sortConfig.key === "title") {
        valA = (a.title || "").toLowerCase();
        valB = (b.title || "").toLowerCase();
      } else if (sortConfig.key === "month") {
        // Ordinamento per data: Anno -> Mese -> Day (se presente)
        const dateA = a.scheduledDate ? new Date(a.scheduledDate) : (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.year || 2024, (a.month || 1) - 1, 1));
        const dateB = b.scheduledDate ? new Date(b.scheduledDate) : (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.year || 2024, (b.month || 1) - 1, 1));
        valA = dateA.getTime();
        valB = dateB.getTime();
      }

      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [articles, filter, sortConfig]);

  const availableYears = useMemo(() => {
    return [...new Set(articles.map(a => {
      const itemDate = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date();
      return a.year || itemDate.getFullYear();
    }))].filter(Boolean).sort((a,b) => b-a);
  }, [articles]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PER_PAGE)), [filtered.length]);

  // Merge CAT_META with dynamic categories
  const allCategories = useMemo(() => {
    const combined = { ...CAT_META };
    wpCategories.forEach(c => {
      if (!combined[c.slug]) {
        combined[c.slug] = {
          label: c.name,
          color: "text-slate-600",
          bg: "bg-slate-50",
          border: "border-slate-100",
          dynamic: true
        };
      }
    });
    return combined;
  }, [wpCategories]);

  const pageItems  = useMemo(() => filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE), [filtered, page]);

  // ── Stats Memoizzate ─────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    // Consolidiamo tutti gli articoli per avere conteggi reali che corrispondano a WP
    return {
      total:       articles.length,
      pubblicati:  articles.filter(a => a.status === "pubblicato").length,
      programmato: articles.filter(a => a.status === "programmato").length,
      lavorazione: articles.filter(a => a.status === "in_lavorazione").length,
      daFare:      articles.filter(a => a.status === "da_scrivere" || !a.status).length,
    };
  }, [articles]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pageItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pageItems.map(a => a.id)));
    }
  };

  const toggleSelect = (id) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  // Progress solo sui nuovi (non include gli esistenti)
  const pct = stats.total ? Math.round((stats.pubblicati + stats.programmato) / stats.total * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">

      {/* Header stats */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 md:gap-4">
        {[
          { label: "Totali", val: stats.total,       color: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", accent: "bg-slate-500", filter: "all" },
          { label: "Pubblicati",  val: stats.pubblicati,  color: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", accent: "bg-emerald-500", filter: "pubblicato" },
          { label: "Programmati", val: stats.programmato, color: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", accent: "bg-amber-500", filter: "programmato" },
          { label: "In corso",    val: stats.lavorazione, color: "bg-blue-50", border: "border-blue-200", text: "text-blue-700", accent: "bg-blue-500", filter: "in_lavorazione" },
          { label: "Da scrivere", val: stats.daFare,      color: "bg-slate-50", border: "border-slate-200", text: "text-slate-700", accent: "bg-slate-400", filter: "da_scrivere" },
          { label: "Progress",    val: pct + "%",         color: "bg-violet-50", border: "border-violet-200", text: "text-violet-700", accent: "bg-violet-500" },
        ].map(s => (
          <button 
            key={s.label} 
            disabled={!s.filter}
            onClick={() => s.filter && setFilter(f => ({...f, status: s.filter}))}
            className={cn(
              "relative px-2 py-1.5 rounded-lg border transition-all text-left w-full sm:w-auto md:w-full",
              s.filter ? "hover:shadow-sm hover:-translate-y-0.5 cursor-pointer" : "cursor-default",
              s.color, s.border,
              filter.status === s.filter && "ring-2 ring-electric-blue ring-offset-1"
            )}
          >
            <div className={cn("text-base font-bold font-inter leading-tight", s.text)}>{s.val}</div>
            <div className="text-[7px] font-bold uppercase tracking-wider text-slate-500 mt-0.5">{s.label}</div>
            <div className={cn("absolute top-0 left-0 w-full h-0.5 rounded-t-lg", s.accent)} />
          </button>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-500/10">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <BarChart3 size={16} className="text-electric-blue" />
            Progresso Editoriale
          </span>
          <span className="text-electric-blue font-bold font-inter">{pct}%</span>
        </div>
        <div className="bg-slate-100 rounded-full h-3 overflow-hidden">
          <div 
            style={{ width: `${pct}%` }} 
            className="h-full bg-gradient-to-r from-electric-blue to-emerald-500 transition-all duration-1000 ease-out" 
          />
        </div>
      </div>

      {/* Filtri + Cerca Area */}
      <div className="bg-white rounded-3xl p-4 md:p-6 shadow-sm border border-slate-500/10 space-y-4 md:space-y-6">
        <div className="flex flex-col gap-4 w-full">
          <div className="flex flex-wrap items-center gap-3 w-full">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 sm:flex-none justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <select 
                  value={filter.year} 
                  onChange={(e) => { setFilter(f=>({...f,year:e.target.value})); setPage(1); }}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer p-0"
                >
                  <option value="all">Anni</option>
                  {availableYears.map(y => (
                    <option key={y} value={String(y)}>{y}</option>
                  ))}
                </select>
              </div>
              <ChevronLeft size={14} className="-rotate-90 md:hidden text-slate-400" />
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 flex-1 md:flex-none justify-between">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-slate-400" />
                <select 
                  value={filter.month} 
                  onChange={(e) => { setFilter(f=>({...f,month:e.target.value})); setPage(1); }}
                  className="bg-transparent border-none text-sm font-bold text-slate-700 focus:ring-0 cursor-pointer p-0"
                >
                  <option value="all">Mesi</option>
                  {MONTH_NAMES.map((name, i) => (
                    <option key={name} value={String(i + 1)}>{name}</option>
                  ))}
                </select>
              </div>
              <ChevronLeft size={14} className="-rotate-90 md:hidden text-slate-400" />
            </div>
            
            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Category Buttons - Hidden on very small screens, use a select instead or scroll */}
              <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide no-scrollbar -mx-1 px-1">
                {["all", "ai", "oss", "gaming", "linux"].map(c => (
                  <button 
                    key={c} 
                    onClick={() => { setFilter(f=>({...f,cat:c})); setPage(1); }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap",
                      filter.cat === c
                        ? "bg-electric-blue text-white border-electric-blue shadow-lg shadow-electric-blue/20"
                        : "bg-white text-slate-500 border-slate-200 hover:border-electric-blue hover:text-electric-blue"
                    )}
                  >
                    {c === "all" ? "Tutte" : allCategories[c]?.label || c}
                  </button>
                ))}

                {/* Other Categories Dropdown */}
                <div className="relative">
                  <select
                    value={(!["all", "ai", "oss", "gaming", "linux"].includes(filter.cat)) ? filter.cat : "other"}
                    onChange={(e) => {
                      if (e.target.value !== "other") {
                        setFilter(f => ({ ...f, cat: e.target.value }));
                        setPage(1);
                      }
                    }}
                    className={cn(
                      "px-3 py-1.5 rounded-xl text-xs font-bold border appearance-none pr-7 cursor-pointer focus:ring-0 whitespace-nowrap",
                      (!["all", "ai", "oss", "gaming", "linux"].includes(filter.cat))
                        ? "bg-electric-blue text-white border-electric-blue shadow-lg shadow-electric-blue/20"
                        : "bg-white text-slate-500 border-slate-200 hover:border-electric-blue"
                    )}
                    style={{ width: 'auto', minWidth: '100px' }}
                  >
                    <option value="other" disabled={!["all", "ai", "oss", "gaming", "linux"].includes(filter.cat)}>Altre...</option>
                    {Object.keys(allCategories).filter(c => !["ai", "oss", "gaming", "linux"].includes(c)).map(c => (
                      <option key={c} value={c} className="text-slate-900 bg-white">
                        {allCategories[c].label}
                      </option>
                    ))}
                  </select>
                  <div className={cn(
                    "absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none",
                    (!["all", "ai", "oss", "gaming", "linux"].includes(filter.cat)) ? "text-white" : "text-slate-400"
                  )}>
                    <ChevronLeft size={12} className="-rotate-90" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-electric-blue transition-colors" size={18} />
            <input
              id="piano-search-input"
              value={filter.q}
              onChange={e => { setFilter(f=>({...f,q:e.target.value})); setPage(1); }}
              placeholder="Cerca... (Ctrl+K)"
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <button 
                onClick={() => setShowForm(v => !v)}
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-electric-blue/20",
                  showForm 
                    ? "bg-slate-800 text-white" 
                    : "bg-electric-blue text-white hover:bg-electric-blue/90"
                )}
              >
                <Plus size={18} />
                <span className="md:inline">{showForm ? "Chiudi" : "Aggiungi"}</span>
              </button>

              <button 
                onClick={refreshFromSite} 
                disabled={refreshing}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:border-electric-blue hover:text-electric-blue transition-all disabled:opacity-50"
              >
                <RefreshCw size={18} className={refreshing ? "animate-spin" : ""} />
                <span className="hidden sm:inline">{refreshing ? "..." : "Sync"}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 flex-1 md:flex-none">
              <button 
                onClick={deleteGhostArticles}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 transition-all shadow-sm"
                title="Pulizia"
              >
                <Trash2 size={18} />
                <span className="hidden sm:inline">Pulizia</span>
              </button>

              <button 
                onClick={() => setViewMode(v => v === "table" ? "calendar" : "table")}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm bg-white border border-slate-200 text-slate-700 hover:border-violet-500 hover:text-violet-500 transition-all"
              >
                {viewMode === "table" ? <Calendar size={18} /> : <BarChart3 size={18} />}
                <span className="hidden sm:inline">{viewMode === "table" ? "Cal" : "Tab"}</span>
              </button>
            </div>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block" />

            <div className="flex items-center gap-2 w-full md:w-auto justify-end">
              <button 
                onClick={exportCSV}
                title="Esporta CSV"
                className="flex-1 md:flex-none flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-emerald-600 hover:bg-emerald-50 hover:border-emerald-500 transition-all"
              >
                <ExternalLink size={18} />
              </button>
              
              <button 
                onClick={() => setShowWPSettings(true)}
                title="WordPress"
                className="flex-1 md:flex-none flex items-center justify-center p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-800 transition-all"
              >
                <MoreVertical size={18} />
              </button>

              <button 
                onClick={checkDuplicates} 
                disabled={checkingDuplicates}
                title="Duplicati"
                className={cn(
                  "flex-1 md:flex-none flex items-center justify-center p-2.5 rounded-xl transition-all border",
                  checkingDuplicates 
                    ? "bg-slate-100 text-slate-400 border-slate-200" 
                    : "bg-white border-slate-200 text-amber-500 hover:bg-amber-50 hover:border-amber-500"
                )}
              >
                <AlertTriangle size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form aggiunta manuale */}
      {showForm && (
        <form onSubmit={addArticle} className="bg-slate-50 border border-slate-200 rounded-3xl p-6 shadow-inner grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="lg:col-span-4">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Titolo Articolo</label>
            <input 
              required 
              placeholder="Inserisci il titolo dell'articolo..." 
              value={form.title}
              onChange={e => setForm(f=>({...f,title:e.target.value}))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Keyword</label>
            <input 
              placeholder="Keyword principale..." 
              value={form.kw}
              onChange={e => setForm(f=>({...f,kw:e.target.value}))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Categoria</label>
            <select 
              value={form.cat} 
              onChange={e => setForm(f=>({...f,cat:e.target.value}))}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all cursor-pointer"
            >
              {Object.entries(allCategories).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Pianificazione</label>
            <div className="grid grid-cols-2 gap-2">
              <select 
                value={form.month} 
                onChange={e => setForm(f=>({...f,month:Number(e.target.value)}))}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all cursor-pointer"
              >
                {MONTH_NAMES.map((name, i) => (
                  <option key={name} value={i + 1}>{name}</option>
                ))}
              </select>
              <input 
                type="number" 
                placeholder="Anno" 
                value={form.year}
                onChange={e => setForm(f=>({...f,year:Number(e.target.value)}))}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2.5 text-xs focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button 
              type="submit" 
              disabled={saving}
              className="w-full bg-electric-blue text-white rounded-xl py-2.5 font-bold text-sm hover:bg-electric-blue/90 shadow-lg shadow-electric-blue/20 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <RefreshCw className="animate-spin" size={16} /> : <Plus size={16} />}
              {saving ? "Salvataggio..." : "Aggiungi al Piano"}
            </button>
          </div>
        </form>
      )}

      {/* Tabella articoli */}

      {/* Vista Calendario Multipagina */}
      {viewMode === "calendar" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {MONTH_NAMES.map((name, i) => {
            const m = i + 1;
            const curArticles = articles.filter(a => 
              (filter.year === "all" || String(a.year) === filter.year) && 
              a.month === m
            );
            if (filter.month !== "all" && String(m) !== filter.month) return null;
            if (curArticles.length === 0 && filter.month === "all") return null;

            return (
              <div key={m} className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[300px]">
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-sm text-deep-space font-inter uppercase tracking-wider">{name}</span>
                  <span className="text-[10px] font-bold text-slate-400">{filter.year !== "all" ? filter.year : ""}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {curArticles.map(a => (
                    <div key={a.id} className="p-3 rounded-2xl bg-slate-50 border border-slate-100 hover:border-electric-blue/30 transition-all group">
                      <div className="font-bold text-[11px] text-deep-space leading-snug mb-2 group-hover:text-electric-blue transition-colors">{decodeHTML(a.title)}</div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge text={a.cat} meta={allCategories} />
                        <span className={cn(
                          "text-[9px] font-bold px-2 py-0.5 rounded",
                          DIFF_META[a.diff]?.bg || "bg-slate-100",
                          DIFF_META[a.diff]?.color || "text-slate-600"
                        )}>
                          {a.diff ? DIFF_META[a.diff].label : "—"}
                        </span>
                      </div>
                    </div>
                  ))}
                  {curArticles.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 opacity-50 space-y-2">
                       <Calendar size={24} />
                       <span className="text-[10px] uppercase font-bold tracking-tighter">Nessun articolo</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Tabella articoli */}
      {viewMode === "table" && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-500/10 overflow-hidden w-full max-w-full">
          <div className="overflow-x-auto w-full scrollbar-thin">
            <table className="w-full border-collapse text-left min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-200">
                  <th className="px-6 py-4">
                    <input 
                      type="checkbox" 
                      checked={pageItems.length > 0 && selectedIds.size === pageItems.length} 
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-electric-blue focus:ring-electric-blue outline-none cursor-pointer" 
                    />
                  </th>
                  <th className="px-4 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest">#</th>
                  <th 
                    onClick={() => toggleSort("title")}
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer group hover:text-electric-blue transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      Titolo
                      <ArrowUpDown size={14} className={cn("transition-opacity", sortConfig.key === "title" ? "opacity-100 text-electric-blue" : "opacity-0 group-hover:opacity-50")} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Categoria</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Keyword</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest">Difficoltà</th>
                  <th 
                    onClick={() => toggleSort("month")}
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest cursor-pointer group hover:text-electric-blue transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-2">
                      Data
                      <ArrowUpDown size={14} className={cn("transition-opacity", sortConfig.key === "month" ? "opacity-100 text-electric-blue" : "opacity-0 group-hover:opacity-50")} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-center">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-widest text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageItems.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-slate-50 text-slate-300">
                          <Search size={48} />
                        </div>
                        <div className="text-slate-500 font-medium">Nessun articolo trovato</div>
                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                          {articles.length === 0 
                            ? "Inizia importando analisi o aggiungendo articoli manualmente." 
                            : "Prova a regolare i filtri per trovare quello che cerchi."}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
                {pageItems.map((a, idx) => {
                  const isDone = a.status === "pubblicato";
                  const isCheckingSEO = checkingSEO === a.id;
                  const seo = seoResult?.id === a.id ? seoResult : null;

                  return (
                    <tr 
                      key={a.id} 
                      className={cn(
                        "group transition-all hover:bg-slate-50/80",
                        selectedIds.has(a.id) ? "bg-electric-blue/5" : (isDone ? "bg-emerald-50/30" : "bg-white text-slate-400")
                      )}
                    >
                      <td className="px-6 py-4">
                        <input 
                          type="checkbox" 
                          checked={selectedIds.has(a.id)} 
                          onChange={() => toggleSelect(a.id)}
                          className="w-4 h-4 rounded border-slate-300 text-electric-blue focus:ring-electric-blue outline-none cursor-pointer" 
                        />
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-slate-400">
                        {(page-1)*PER_PAGE + idx + 1}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 max-w-xs lg:max-w-md">
                          <div className="flex items-center gap-2">
                            <span className={cn(
                              "font-bold text-sm font-inter transition-colors",
                              isDone ? "text-slate-400 line-through" : "text-deep-space"
                            )}>
                              {decodeHTML(a.title)}
                            </span>
                            {duplicateWarnings[a.id] && (
                              <div className="relative group/warn">
                                <AlertTriangle 
                                  size={16} 
                                  className="text-amber-500 cursor-help" 
                                />
                                <div className="absolute left-0 bottom-full mb-2 hidden group-hover/warn:block z-50 w-64 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl">
                                  {duplicateWarnings[a.id].type === 'duplicato' ? 'Duplicato esatto' : duplicateWarnings[a.id].type === 'stessa_kw' ? 'Stessa Keyword' : 'Molto simile'} a: {duplicateWarnings[a.id].relatedTitle}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            {a.source === "keyword-researcher" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-violet-600 uppercase tracking-tighter">
                                <Search size={10} /> KR
                              </span>
                            )}
                            {a.source === "wp-import" && (
                              <span className="flex items-center gap-1 text-[9px] font-bold text-emerald-600 uppercase tracking-tighter">
                                <RefreshCw size={10} /> WP
                              </span>
                            )}
                            {a.existingUrl && (
                              <a 
                                href={a.existingUrl} 
                                target="_blank" 
                                rel="noreferrer" 
                                className={cn(
                                  "flex items-center gap-1 text-[9px] font-bold uppercase tracking-tighter hover:underline",
                                  a.wpStatus === "programmato" ? "text-amber-600" : "text-sky-600"
                                )}
                              >
                                <ExternalLink size={10} /> {a.wpStatus === "programmato" ? "Programmato" : "Pubblicato"}
                              </a>
                            )}
                            {a.scheduledDate && (
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar size={10} /> {new Date(a.scheduledDate).toLocaleDateString()}
                              </span>
                            )}
                            <button 
                              onClick={() => showLinkSuggestions(a)} 
                              className="text-[9px] font-bold text-electric-blue hover:text-electric-blue/80 border-b border-electric-blue/30 border-dotted"
                            >
                              LINK CORRELATI
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-2">
                          <Badge text={a.cat} meta={allCategories} />
                          {isDone && a.existingUrl && (
                            <button 
                              onClick={() => runSEOCheck(a)} 
                              disabled={isCheckingSEO}
                              className={cn(
                                "inline-flex items-center justify-center px-2 py-0.5 rounded-md text-[9px] font-bold transition-all",
                                seo 
                                  ? (seo.score > 60 ? "bg-emerald-500 text-white" : "bg-amber-500 text-white") 
                                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                              )}
                            >
                              {isCheckingSEO ? <RefreshCw size={10} className="animate-spin" /> : (seo ? `SEO: ${seo.score}%` : "CHECK SEO")}
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-semibold text-slate-500 truncate max-w-[120px]" title={a.kw}>
                        {a.kw || "—"}
                      </td>
                      <td className="px-6 py-4">
                        <Badge text={a.diff} meta={DIFF_META} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-deep-space font-bold text-sm">
                            {a.month ? MONTH_NAMES[a.month - 1] : "—"}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">{a.year || ""}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBtn status={a.status || "da_scrivere"} onChange={() => cycleStatus(a)} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          {a.analysisId ? (
                             <button 
                               onClick={() => onViewResults(a.analysisId)} 
                               title="Vedi Analisi"
                               className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100"
                             >
                               <BarChart3 size={16} />
                             </button>
                          ) : (
                             <button 
                               onClick={() => startTransition(() => onAnalyze(a.title, a.id))} 
                               disabled={globalLoading}
                               title="Esegui Analisi"
                               className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 disabled:opacity-50"
                             >
                               <Search size={16} />
                             </button>
                          )}
                          <button
                            onClick={() => handleCopyBrief(a)}
                            disabled={briefStatus[a.id] === 'loading'}
                            title="Copia Brief"
                            className={cn(
                              "flex items-center gap-1 p-1.5 rounded-lg transition-all text-[10px] font-bold whitespace-nowrap",
                              briefStatus[a.id] === 'error' ? "bg-red-50 text-red-600" :
                              briefStatus[a.id] === 'success' ? "bg-emerald-50 text-emerald-600" :
                              "bg-slate-50 text-slate-600 hover:bg-slate-200"
                            )}
                          >
                            {briefStatus[a.id] === 'loading' ? (
                              <><RefreshCw size={14} className="animate-spin" /> Generando...</>
                            ) : briefStatus[a.id] === 'success' ? (
                              <><CheckCircle2 size={14} /> Copiato!</>
                            ) : briefStatus[a.id] === 'error' ? (
                              <><AlertTriangle size={14} /> Errore, riprova</>
                            ) : (
                              <><FileText size={16} /> Copia Brief</>
                            )}
                          </button>
                          {!isDone && (
                            <button 
                              onClick={() => createWPDraft(a)} 
                              title="Crea Bozza WP"
                              className="p-1.5 rounded-lg bg-slate-50 text-slate-600 hover:bg-slate-200"
                            >
                              <Edit3 size={16} />
                            </button>
                          )}
                          <button 
                            onClick={() => deleteArticle(a.id)}
                            title="Elimina"
                            className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal WP Settings */}
      {showWPSettings && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-md shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold font-inter text-deep-space">WordPress Integration</h3>
              <button 
                onClick={() => setShowWPSettings(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">URL del Sito</label>
                <div className="relative">
                  <ExternalLink size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    value={wpSettings.url} 
                    onChange={e => setWPSettings({...wpSettings, url: e.target.value})} 
                    placeholder="https://www.tuosito.it" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-4 py-3 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Nome Utente</label>
                <input 
                  value={wpSettings.user} 
                  onChange={e => setWPSettings({...wpSettings, user: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Application Password</label>
                <input 
                  type="password" 
                  value={wpSettings.pass} 
                  onChange={e => setWPSettings({...wpSettings, pass: e.target.value})} 
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm focus:ring-2 focus:ring-electric-blue/20 focus:border-electric-blue outline-none transition-all"
                />
                <p className="text-[10px] text-slate-400 mt-2 italic px-1">
                  Generabile da: Utenti &gt; Profilo &gt; Password applicative su WP.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-8">
              <button 
                onClick={saveWPSettings} 
                className="bg-electric-blue text-white rounded-2xl py-3 font-bold text-sm shadow-lg shadow-electric-blue/20 hover:bg-electric-blue/90"
              >
                Salva Config
              </button>
              <button 
                onClick={testWPConnection} 
                disabled={testingWP}
                className="bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-2xl py-3 font-bold text-sm hover:bg-emerald-100 disabled:opacity-50"
              >
                {testingWP ? "Test in corso..." : "Test Connessione"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Suggest Link */}
      {suggestions && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, color: "var(--color-text-primary)" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: 500, boxShadow: "0 10px 40px rgba(0,0,0,0.2)" }}>
            <h3 style={{ marginTop: 0 }}>Suggerimenti Link Interni</h3>
            <p style={{ fontSize: 13, color: "#666" }}>Pagine pubblicate correlate a: <strong>{suggestions.article.title}</strong></p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, margin: "20px 0" }}>
              {suggestions.items.map(item => (
                <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f8f9fa", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 12 }}>
                    <div style={{ fontWeight: 600 }}>{item.title}</div>
                    <div style={{ color: "#0284c7" }}>{item.existingUrl}</div>
                  </div>
                  <button onClick={() => { navigator.clipboard.writeText(item.existingUrl); alert("Copiato!"); }} style={{ fontSize: 10, padding: "4px 8px", background: "#e0f2fe", color: "#0369a1", border: "none", borderRadius: 4, cursor: "pointer" }}>Copia Link</button>
                </div>
              ))}
              {suggestions.items.length === 0 && <div style={{ textAlign: "center", opacity: 0.5 }}>Nessun articolo correlato trovato online.</div>}
            </div>
            <button onClick={() => setSuggestions(null)} style={{ width: "100%", padding: 10, borderRadius: 8, background: "#f3f4f6", color: "#374151", border: "none" }}>Chiudi</button>
          </div>
        </div>
      )}

      {/* Modal Revisione Duplicati */}
      {showDuplicateReview && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, color: "var(--color-text-primary)" }}>
          <div style={{ background: "#fff", padding: 24, borderRadius: 16, width: "90%", maxWidth: 800, maxHeight: "85vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ margin: 0 }}>Revisione Articoli Duplicati o Simili</h3>
              <button onClick={() => setShowDuplicateReview(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#666" }}>✕</button>
            </div>
            
            <p style={{ fontSize: 13, color: "#666", marginBottom: 20 }}>
              Sono stati trovati {Object.keys(duplicateWarnings).length} articoli con potenziali conflitti. Revisiona la lista e usa l'icona <span style={{color: "#ef4444"}}>✕</span> per eliminare quelli non necessari.
            </p>

            <div style={{ flex: 1, overflowY: "auto", paddingRight: 10 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead style={{ position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
                  <tr style={{ textAlign: "left", borderBottom: "2px solid #eee" }}>
                    <th style={{ padding: "10px 5px" }}>Articolo</th>
                    <th style={{ padding: "10px 5px" }}>Problema</th>
                    <th style={{ padding: "10px 5px", textAlign: "right" }}>Azione</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(duplicateWarnings).map(([id, info]) => {
                    const art = articles.find(a => a.id === id);
                    if (!art) return null;
                    return (
                      <tr key={id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "12px 5px" }}>
                          <div style={{ fontWeight: 600 }}>{art.title}</div>
                          <div style={{ fontSize: 11, color: "#9ca3af" }}>KW: {art.kw || "—"}</div>
                        </td>
                        <td style={{ padding: "12px 5px" }}>
                          <span style={{ 
                            fontSize: 10, padding: "2px 6px", borderRadius: 4, 
                            background: info.type === 'duplicato' ? "#fee2e2" : info.type === 'stessa_kw' ? "#fef3c7" : "#e0f2fe",
                            color: info.type === 'duplicato' ? "#991b1b" : info.type === 'stessa_kw' ? "#92400e" : "#075985"
                          }}>
                            {info.type === 'duplicato' ? 'DUPLICATO ESATTO' : info.type === 'stessa_kw' ? 'STESSA KEYWORD' : 'MOLTO SIMILE'}
                          </span>
                          <div style={{ fontSize: 11, marginTop: 4, fontStyle: "italic" }}>Correlato a: {info.relatedTitle}</div>
                        </td>
                        <td style={{ padding: "12px 5px", textAlign: "right" }}>
                          <button 
                            onClick={() => {
                              deleteArticle(art.id);
                              // Aggiorniamo localmente i warnings per far sparire la riga
                              const next = {...duplicateWarnings};
                              delete next[art.id];
                              setDuplicateWarnings(next);
                            }}
                            style={{ background: "#fee2e2", color: "#ef4444", border: "none", width: 28, height: 28, borderRadius: "50%", cursor: "pointer", fontWeight: "bold" }}
                            title="Elimina articolo"
                          >✕</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 20, paddingTop: 15, borderTop: "1px solid #eee", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button 
                onClick={bulkDeleteDuplicates} 
                disabled={saving}
                style={{ padding: "10px 24px", borderRadius: 8, background: "#fee2e2", color: "#ef4444", border: "1.5px solid #ef4444", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer" }}
              >
                {saving ? "Eliminazione..." : `🗑️ Elimina tutti (${Object.keys(duplicateWarnings).length})`}
              </button>
              <button onClick={() => setShowDuplicateReview(false)} style={{ padding: "10px 24px", borderRadius: 8, background: "#6366f1", color: "#fff", border: "none", fontWeight: 600, cursor: "pointer" }}>
                Ho finito la revisione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Paginazione */}
      <div className="flex items-center justify-between border-t border-slate-200 pt-6 mt-6">
        <div className="text-sm text-slate-500 font-medium">
          Pagina <span className="text-deep-space font-bold">{page}</span> di <span className="text-deep-space font-bold">{totalPages}</span>
          <span className="mx-2 text-slate-300">|</span>
          <span className="text-slate-400">{filtered.length} articoli trovati</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            disabled={page === 1} 
            onClick={() => setPage(p=>p-1)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-electric-blue hover:text-electric-blue disabled:opacity-40 transition-all"
          >
            <ChevronLeft size={16} />
            Precedente
          </button>
          <button 
            disabled={page === totalPages} 
            onClick={() => setPage(p=>p+1)}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-bold bg-white border border-slate-200 text-slate-600 hover:border-electric-blue hover:text-electric-blue disabled:opacity-40 transition-all"
          >
            Successiva
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-[2rem] flex items-center gap-6 shadow-2xl border border-white/10 z-[100] animate-in slide-in-from-bottom-8 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-electric-blue flex items-center justify-center font-bold text-sm">
              {selectedIds.size}
            </div>
            <span className="text-sm font-bold tracking-tight">Articoli selezionati</span>
          </div>
          
          <div className="h-6 w-px bg-white/20" />
          
          <div className="flex items-center gap-3">
            <select 
              onChange={(e) => bulkUpdate({ status: e.target.value })}
              className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-0 outline-none cursor-pointer hover:bg-white/20 transition-all"
            >
              <option value="" className="text-slate-900">Cambia Stato...</option>
              {Object.entries(STATUS_META).map(([k,v]) => <option key={k} value={k} className="text-slate-900">{v.label}</option>)}
            </select>

            <select 
              onChange={(e) => bulkUpdate({ month: Number(e.target.value) })}
              className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-xs font-bold focus:ring-0 outline-none cursor-pointer hover:bg-white/20 transition-all"
            >
              <option value="" className="text-slate-900">Sposta Mese...</option>
              {MONTH_NAMES.map((name, i) => <option key={i} value={i+1} className="text-slate-900">{name}</option>)}
            </select>

            <button 
              onClick={bulkDelete} 
              className="flex items-center gap-2 bg-rose-500 hover:bg-rose-600 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-500/20"
            >
              <Trash2 size={14} />
              Elimina
            </button>
          </div>

          <button 
            onClick={() => setSelectedIds(new Set())}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <ChevronRight size={20} className="rotate-90" />
          </button>
        </div>
      )}

      {/* Link Suggestions Modal */}
      {suggestions && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-lg shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold font-inter text-deep-space">Suggerimenti Link Interni</h3>
                <p className="text-xs text-slate-500 mt-1 font-medium">Correlati a: <span className="text-electric-blue">{suggestions.article.title}</span></p>
              </div>
              <button 
                onClick={() => setSuggestions(null)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Trash2 size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {suggestions.items.map(item => (
                <div key={item.id} className="group p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-electric-blue/30 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-deep-space mb-1 leading-tight">{item.title}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[280px]">{item.existingUrl}</div>
                    </div>
                    <button 
                      onClick={() => { navigator.clipboard.writeText(item.existingUrl); }} 
                      className="shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[10px] font-bold text-slate-600 hover:border-electric-blue hover:text-electric-blue shadow-sm transition-all active:scale-95"
                    >
                      Copia Link
                    </button>
                  </div>
                </div>
              ))}
              {suggestions.items.length === 0 && (
                <div className="py-12 text-center">
                  <div className="text-slate-300 mb-2 flex justify-center"><ExternalLink size={40} /></div>
                  <div className="text-sm text-slate-400 font-medium">Nessun articolo correlato trovato online.</div>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => setSuggestions(null)}
              className="w-full mt-6 bg-slate-100 text-slate-600 rounded-2xl py-3 font-bold text-sm hover:bg-slate-200 transition-all font-inter"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* Revisione Duplicati Modal */}
      {showDuplicateReview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[120] animate-in fade-in duration-300">
          <div className="bg-white p-8 rounded-[2rem] w-full max-w-4xl shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold font-inter text-deep-space">Revisione Conflitti</h3>
                <p className="text-sm text-slate-500 mt-1">Sono stati identificati <span className="font-bold text-amber-600">{Object.keys(duplicateWarnings).length} articoli</span> con potenziali duplicati o keyword sovrapposte.</p>
              </div>
              <button 
                onClick={() => setShowDuplicateReview(false)}
                className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors"
              >
                <Trash2 size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-2">Articolo</th>
                    <th className="px-4 py-2">Problema Rilevato</th>
                    <th className="px-4 py-2 text-right">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(duplicateWarnings).map(([id, info]) => {
                    const art = articles.find(a => a.id === id);
                    if (!art) return null;
                    return (
                      <tr key={id} className="bg-slate-50/50 hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 rounded-l-2xl border-y border-l border-slate-100">
                          <div className="flex items-start gap-3">
                            <div className="flex-1">
                              <div className="font-bold text-sm text-deep-space">{art.title}</div>
                              <div className="text-[10px] text-slate-400 mt-0.5">Keyword: <span className="font-semibold text-slate-500">{art.kw || "—"}</span></div>
                            </div>
                            {STATUS_META[art.status] && (
                              <span className={cn(
                                "flex-shrink-0 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border",
                                STATUS_META[art.status].bg,
                                STATUS_META[art.status].text,
                                STATUS_META[art.status].border
                              )}>
                                {STATUS_META[art.status].label}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4 border-y border-slate-100">
                          <div className="flex flex-col gap-1">
                            <span className={cn(
                              "inline-flex w-fit px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider",
                              info.type === 'duplicato' ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                            )}>
                              {info.type === 'duplicato' ? 'Duplicato Esatto' : info.type === 'stessa_kw' ? 'Keyword Duplicata' : 'Similitudine Elevata'}
                            </span>
                            <div className="text-[10px] text-slate-500 italic">Conflitto con: {info.relatedTitle}</div>
                          </div>
                        </td>
                        <td className="px-4 py-4 rounded-r-2xl border-y border-r border-slate-100 text-right">
                          <button 
                            onClick={() => {
                              deleteArticle(art.id);
                              const next = {...duplicateWarnings};
                              delete next[art.id];
                              setDuplicateWarnings(next);
                            }}
                            className="p-2 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-8 pt-8 border-t border-slate-100">
              <button 
                onClick={bulkDeleteDuplicates} 
                disabled={saving}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-rose-500 text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-rose-600 transition-all shadow-lg shadow-rose-500/20 disabled:opacity-50"
              >
                <Trash2 size={18} />
                {saving ? "Eliminazione..." : `Elimina tutti (${Object.keys(duplicateWarnings).length})`}
              </button>
              <button 
                onClick={() => setShowDuplicateReview(false)}
                className="w-full sm:w-auto bg-deep-space text-white px-8 py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg"
              >
                Ho terminato la revisione
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
