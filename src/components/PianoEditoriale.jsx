import { useState, useEffect } from "react";
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
} from "firebase/firestore";

// ─── Costanti ────────────────────────────────────────────────────────────────

const CAT_META = {
  ai:      { label: "AI",          color: "#7c3aed", bg: "#f5f3ff" },
  linux:   { label: "Linux",       color: "#059669", bg: "#ecfdf5" },
  oss:     { label: "Open Source", color: "#0284c7", bg: "#e0f2fe" },
  gaming:  { label: "Gaming",      color: "#d97706", bg: "#fef3c7" },
  tools:   { label: "Tools",       color: "#db2777", bg: "#fce7f3" },
  news:    { label: "News",        color: "#16a34a", bg: "#dcfce7" },
};

const DIFF_META = {
  bassa:  { label: "Bassa",  color: "#15803d" },
  media:  { label: "Media",  color: "#b45309" },
  alta:   { label: "Alta",   color: "#b91c1c" },
};

const STATUS_META = {
  da_scrivere:   { label: "Da scrivere",   next: "in_lavorazione" },
  in_lavorazione:{ label: "In lavorazione",next: "pubblicato"     },
  pubblicato:    { label: "Pubblicato ✓",  next: "da_scrivere"    },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function Badge({ text, meta }) {
  if (!text || !meta?.[text]) return null;
  const { label, color, bg } = meta[text];
  return (
    <span style={{
      display: "inline-block", padding: "2px 8px", borderRadius: 10,
      fontSize: 11, fontWeight: 600, background: bg || "#f3f4f6",
      color, border: `1px solid ${color}22`, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}

function StatusBtn({ status, onChange }) {
  const m = STATUS_META[status] || STATUS_META.da_scrivere;
  const colors = {
    da_scrivere:    { bg: "#f3f4f6", color: "#374151" },
    in_lavorazione: { bg: "#dbeafe", color: "#1d4ed8" },
    pubblicato:     { bg: "#dcfce7", color: "#15803d" },
  };
  const c = colors[status] || colors.da_scrivere;
  return (
    <button onClick={onChange}
      style={{
        padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 600,
        border: "none", cursor: "pointer", background: c.bg, color: c.color,
        whiteSpace: "nowrap",
      }}>
      {m.label}
    </button>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────

export default function PianoEditoriale({ onAnalyze, onViewResults, loading: globalLoading }) {
  const [articles, setArticles] = useState([]);
  const [filter, setFilter]     = useState({ month: "all", cat: "all", status: "all", q: "" });
  const [page, setPage]         = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ title: "", kw: "", cat: "ai", diff: "bassa", tipo: "Tutorial", month: 1 });
  const [saving, setSaving]     = useState(false);
  const PER_PAGE = 20;

  // ── Carica articoli da Firestore in real-time ────────────────────────────
  useEffect(() => {
    const q = query(collection(db, "piano_editoriale"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setArticles(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, []);

  // ── Aggiorna status ──────────────────────────────────────────────────────
  async function cycleStatus(article) {
    const next = STATUS_META[article.status]?.next || "da_scrivere";
    await updateDoc(doc(db, "piano_editoriale", article.id), { status: next });
  }

  // ── Marca completato (checkbox) ──────────────────────────────────────────
  async function toggleDone(article) {
    const next = article.status === "pubblicato" ? "da_scrivere" : "pubblicato";
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
    setSaving(true);
    await addDoc(collection(db, "piano_editoriale"), {
      ...form,
      status: "da_scrivere",
      source: "manuale",
      createdAt: serverTimestamp(),
    });
    setForm({ title: "", kw: "", cat: "ai", diff: "bassa", tipo: "Tutorial", month: 1 });
    setShowForm(false);
    setSaving(false);
  }

  // ── Filtraggio ────────────────────────────────────────────────────────────
  const filtered = articles.filter(a => {
    const mOk  = filter.month  === "all" || String(a.month) === filter.month;
    const cOk  = filter.cat    === "all" || a.cat    === filter.cat;
    const sOk  = filter.status === "all" || a.status === filter.status;
    const qOk  = !filter.q || a.title.toLowerCase().includes(filter.q.toLowerCase())
                           || (a.kw || "").toLowerCase().includes(filter.q.toLowerCase());
    return mOk && cOk && sOk && qOk;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const pageItems  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    total:       articles.length,
    pubblicati:  articles.filter(a => a.status === "pubblicato").length,
    lavorazione: articles.filter(a => a.status === "in_lavorazione").length,
    daFare:      articles.filter(a => a.status === "da_scrivere" || !a.status).length,
  };
  const pct = stats.total ? Math.round(stats.pubblicati / stats.total * 100) : 0;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ fontFamily: "var(--font-sans, sans-serif)", padding: "0 0 40px" }}>

      {/* Header stats */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        {[
          { label: "Totale articoli", val: stats.total,       accent: "#6366f1" },
          { label: "Pubblicati",      val: stats.pubblicati,  accent: "#16a34a" },
          { label: "In lavorazione",  val: stats.lavorazione, accent: "#2563eb" },
          { label: "Da scrivere",     val: stats.daFare,      accent: "#9ca3af" },
          { label: "Completamento",   val: pct + "%",         accent: "#7c3aed" },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--color-background-secondary, #f8f9fa)",
            border: "1px solid var(--color-border-tertiary, #e5e7eb)",
            borderRadius: 10, padding: "10px 16px", minWidth: 120,
            borderTop: `3px solid ${s.accent}`,
          }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: "var(--color-text-primary)" }}>{s.val}</div>
            <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 2 }}>{s.label}</div>
          </div>
        ))}

        {/* Progress bar */}
        <div style={{ flex: 1, minWidth: 200, display: "flex", flexDirection: "column", justifyContent: "center", gap: 6 }}>
          <div style={{ fontSize: 11, color: "var(--color-text-secondary)" }}>Progresso piano</div>
          <div style={{ background: "var(--color-border-tertiary, #e5e7eb)", borderRadius: 8, height: 8, overflow: "hidden" }}>
            <div style={{ width: pct + "%", height: "100%", background: "linear-gradient(90deg,#6366f1,#16a34a)", borderRadius: 8, transition: "width .4s" }} />
          </div>
        </div>
      </div>

      {/* Filtri + Cerca */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
        {/* Mese */}
        {["all", "1", "2", "3"].map(m => (
          <button key={m} onClick={() => { setFilter(f=>({...f,month:m})); setPage(1); }}
            style={{
              padding: "5px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer",
              border: "1.5px solid var(--color-border-secondary,#d1d5db)",
              background: filter.month === m ? "var(--color-text-primary)" : "transparent",
              color: filter.month === m ? "var(--color-background-primary,#fff)" : "var(--color-text-secondary)",
              fontWeight: filter.month === m ? 600 : 400,
            }}>
            {m === "all" ? "Tutti" : `Mese ${m}`}
          </button>
        ))}

        <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>|</span>

        {/* Categoria */}
        {["all", ...Object.keys(CAT_META)].map(c => (
          <button key={c} onClick={() => { setFilter(f=>({...f,cat:c})); setPage(1); }}
            style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer",
              border: filter.cat === c
                ? `1.5px solid ${c === "all" ? "#374151" : CAT_META[c].color}`
                : "1px solid var(--color-border-tertiary,#e5e7eb)",
              background: filter.cat === c
                ? (c === "all" ? "#374151" : CAT_META[c].bg)
                : "transparent",
              color: filter.cat === c
                ? (c === "all" ? "#fff" : CAT_META[c].color)
                : "var(--color-text-secondary)",
              fontWeight: filter.cat === c ? 600 : 400,
            }}>
            {c === "all" ? "Tutte" : CAT_META[c].label}
          </button>
        ))}

        <span style={{ color: "var(--color-text-secondary)", fontSize: 12 }}>|</span>

        {/* Status */}
        {["all", "da_scrivere", "in_lavorazione", "pubblicato"].map(s => (
          <button key={s} onClick={() => { setFilter(f=>({...f,status:s})); setPage(1); }}
            style={{
              padding: "4px 10px", borderRadius: 12, fontSize: 11, cursor: "pointer",
              border: "1px solid var(--color-border-tertiary,#e5e7eb)",
              background: filter.status === s ? "var(--color-background-secondary,#f3f4f6)" : "transparent",
              color: filter.status === s ? "var(--color-text-primary)" : "var(--color-text-secondary)",
              fontWeight: filter.status === s ? 600 : 400,
            }}>
            {s === "all" ? "Tutti gli stati" : STATUS_META[s]?.label}
          </button>
        ))}
      </div>

      {/* Search + Add button */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <input
          value={filter.q}
          onChange={e => { setFilter(f=>({...f,q:e.target.value})); setPage(1); }}
          placeholder="Cerca articolo o keyword..."
          style={{
            flex: 1, padding: "8px 12px", borderRadius: 8, fontSize: 13,
            border: "1px solid var(--color-border-secondary,#d1d5db)",
            background: "var(--color-background-secondary,#f9fafb)",
            color: "var(--color-text-primary)", outline: "none",
          }}
        />
        <button onClick={() => setShowForm(v => !v)}
          style={{
            padding: "8px 16px", borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: "#6366f1", color: "#fff", border: "none", cursor: "pointer",
          }}>
          {showForm ? "✕ Chiudi" : "+ Aggiungi articolo"}
        </button>
      </div>

      {/* Form aggiunta manuale */}
      {showForm && (
        <form onSubmit={addArticle} style={{
          background: "var(--color-background-secondary,#f9fafb)",
          border: "1px solid var(--color-border-secondary,#d1d5db)",
          borderRadius: 10, padding: 16, marginBottom: 16,
          display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10,
        }}>
          <input required placeholder="Titolo articolo *" value={form.title}
            onChange={e => setForm(f=>({...f,title:e.target.value}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13, gridColumn: "1 / -1" }} />
          <input placeholder="Keyword principale" value={form.kw}
            onChange={e => setForm(f=>({...f,kw:e.target.value}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }} />
          <select value={form.cat} onChange={e => setForm(f=>({...f,cat:e.target.value}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            {Object.entries(CAT_META).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={form.diff} onChange={e => setForm(f=>({...f,diff:e.target.value}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            <option value="bassa">Difficoltà: Bassa</option>
            <option value="media">Difficoltà: Media</option>
            <option value="alta">Difficoltà: Alta</option>
          </select>
          <select value={form.tipo} onChange={e => setForm(f=>({...f,tipo:e.target.value}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            {["Tutorial","Guida","Confronto","Listicle","Recensione","News/Review","Approfondimento"].map(t =>
              <option key={t}>{t}</option>)}
          </select>
          <select value={form.month} onChange={e => setForm(f=>({...f,month:Number(e.target.value)}))}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: 13 }}>
            <option value={1}>Mese 1</option>
            <option value={2}>Mese 2</option>
            <option value={3}>Mese 3</option>
          </select>
          <button type="submit" disabled={saving}
            style={{ padding: "8px 16px", borderRadius: 6, background: "#6366f1", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {saving ? "Salvo..." : "💾 Aggiungi"}
          </button>
        </form>
      )}

      {/* Tabella articoli */}
      <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--color-border-tertiary,#e5e7eb)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--color-background-secondary,#f9fafb)", borderBottom: "1.5px solid var(--color-border-secondary,#e5e7eb)" }}>
              {["✓","#","Titolo","Categoria","Keyword","Difficoltà","Tipo","Mese","Status","Azioni"].map((h,i) => (
                <th key={i} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 600,
                  color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: ".4px",
                  whiteSpace: "nowrap" }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: 40, color: "var(--color-text-secondary)" }}>
                Nessun articolo trovato. {articles.length === 0 ? "Importa analisi dal Keyword Researcher o aggiungi manualmente." : "Prova a cambiare i filtri."}
              </td></tr>
            )}
            {pageItems.map((a, idx) => {
              const isDone = a.status === "pubblicato";
              return (
                <tr key={a.id} style={{
                  borderBottom: "1px solid var(--color-border-tertiary,#f3f4f6)",
                  background: isDone ? "var(--color-background-success,#f0fdf4)" : "transparent",
                  opacity: isDone ? 0.8 : 1,
                }}>
                  {/* Checkbox */}
                  <td style={{ padding: "8px 12px" }}>
                    <input type="checkbox" checked={isDone} onChange={() => toggleDone(a)}
                      style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }} />
                  </td>
                  {/* # */}
                  <td style={{ padding: "8px 12px", color: "var(--color-text-secondary)", fontSize: 11 }}>
                    {(page-1)*PER_PAGE + idx + 1}
                  </td>
                  {/* Titolo */}
                  <td style={{ padding: "8px 12px", maxWidth: 320 }}>
                    <div style={{ fontWeight: 500, color: "var(--color-text-primary)", textDecoration: isDone ? "line-through" : "none" }}>
                      {a.title}
                    </div>
                  </td>
                  {/* Categoria */}
                  <td style={{ padding: "8px 12px" }}>
                    <Badge text={a.cat} meta={CAT_META} />
                  </td>
                  {/* Keyword */}
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)", maxWidth: 200 }}>
                    {a.kw || "—"}
                  </td>
                  {/* Difficoltà */}
                  <td style={{ padding: "8px 12px" }}>
                    <Badge text={a.diff} meta={DIFF_META} />
                  </td>
                  {/* Tipo */}
                  <td style={{ padding: "8px 12px", fontSize: 11, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {a.tipo || "—"}
                  </td>
                  {/* Mese */}
                  <td style={{ padding: "8px 12px", fontSize: 12, color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>
                    {a.month ? `Mese ${a.month}` : "—"}
                  </td>
                  {/* Status */}
                  <td style={{ padding: "8px 12px" }}>
                    <StatusBtn status={a.status || "da_scrivere"} onChange={() => cycleStatus(a)} />
                  </td>
                  {/* Azioni */}
                  <td style={{ padding: "8px 12px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        {a.analysisId ? (
                             <button onClick={() => onViewResults(a.analysisId)} 
                                     style={{ border: "1px solid #7c3aed", color: "#7c3aed", background: "none", fontSize: 10, padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>
                                 Risultati
                             </button>
                        ) : (
                             <button onClick={() => onAnalyze(a.title, a.id)} 
                                     disabled={globalLoading}
                                     style={{ border: "1px solid #6366f1", color: "#6366f1", background: "none", fontSize: 10, padding: "2px 6px", borderRadius: 4, cursor: "pointer" }}>
                                 {globalLoading ? "..." : "🔍 Analizza"}
                             </button>
                        )}
                        <button onClick={() => deleteArticle(a.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, padding: 0 }}
                          title="Elimina">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginazione */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12, fontSize: 13, color: "var(--color-text-secondary)" }}>
        <button disabled={page === 1} onClick={() => setPage(p=>p-1)}
          style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--color-border-secondary,#d1d5db)", background: "transparent",
            cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? .4 : 1, color: "var(--color-text-primary)" }}>
          ← Prec
        </button>
        <span>Pagina {page} di {totalPages} · {filtered.length} articoli</span>
        <button disabled={page === totalPages} onClick={() => setPage(p=>p+1)}
          style={{ padding: "4px 12px", borderRadius: 6, border: "1px solid var(--color-border-secondary,#d1d5db)", background: "transparent",
            cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? .4 : 1, color: "var(--color-text-primary)" }}>
          Succ →
        </button>
      </div>
    </div>
  );
}
