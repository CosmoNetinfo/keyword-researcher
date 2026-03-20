import { useState, useEffect, useCallback } from "react";
import { ExternalLink, RefreshCw, Rss, Globe, TrendingUp, Copy, Check } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) { return twMerge(clsx(inputs)); }

// ─── Configurazione categorie ─────────────────────────────────────────────────
const CATEGORIES = [
  { id: "all",       label: "Tutti",        emoji: "📡", color: "indigo" },
  { id: "tech-it",   label: "🇮🇹 Italiani",  emoji: "",   color: "emerald" },
  { id: "linux",     label: "Linux",        emoji: "🐧", color: "orange" },
  { id: "ai",        label: "AI",           emoji: "🤖", color: "violet" },
  { id: "gaming",    label: "Gaming",       emoji: "🎮", color: "rose" },
  { id: "selfhosted",label: "Self-hosted",  emoji: "🔧", color: "amber" },
  { id: "tech-en",   label: "Tech EN",      emoji: "🌍", color: "sky" },
];

const CAT_COLORS = {
  "tech-it":   { bg: "bg-emerald-50",  text: "text-emerald-700", border: "border-emerald-200", dot: "bg-emerald-500" },
  "linux":     { bg: "bg-orange-50",   text: "text-orange-700",  border: "border-orange-200",  dot: "bg-orange-500" },
  "ai":        { bg: "bg-violet-50",   text: "text-violet-700",  border: "border-violet-200",  dot: "bg-violet-500" },
  "gaming":    { bg: "bg-rose-50",     text: "text-rose-700",    border: "border-rose-200",    dot: "bg-rose-500" },
  "selfhosted":{ bg: "bg-amber-50",    text: "text-amber-700",   border: "border-amber-200",   dot: "bg-amber-500" },
  "tech-en":   { bg: "bg-sky-50",      text: "text-sky-700",     border: "border-sky-200",     dot: "bg-sky-500" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)   return "ora";
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-16 h-4 bg-slate-100 rounded-full" />
        <div className="w-8 h-3 bg-slate-50 rounded-full ml-auto" />
      </div>
      <div className="space-y-2">
        <div className="w-full h-3.5 bg-slate-100 rounded" />
        <div className="w-4/5 h-3.5 bg-slate-100 rounded" />
      </div>
    </div>
  );
}

// ─── Trend Card ───────────────────────────────────────────────────────────────
function TrendCard({ item, onAddToPiano }) {
  const [copied, setCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const colors = CAT_COLORS[item.cat] || CAT_COLORS["tech-en"];
  const ago = timeAgo(item.date);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(item.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group block bg-white rounded-2xl border border-slate-100 p-4 hover:border-indigo-200 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 relative"
    >
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border",
          colors.bg, colors.text, colors.border
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", colors.dot)} />
          {item.sourceName}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={async (e) => {
              e.preventDefault(); e.stopPropagation();
              await onAddToPiano({
                titolo: item.title,
                link_fonte: item.url,
                fonte: item.sourceName,
                categoria: item.cat === "ai" ? "ai" : (item.cat === "gaming" ? "gaming" : "oss")
              });
              setIsAdded(true);
            }}
            disabled={isAdded}
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all border",
              isAdded 
                ? "bg-emerald-50 text-emerald-600 border-emerald-200" 
                : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-600 hover:text-white"
            )}
          >
            {isAdded ? "✓ Aggiunto" : "+ Piano"}
          </button>
          
          <button
            onClick={handleCopy}
            className={cn(
              "p-1.5 rounded-lg transition-all",
              copied ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-indigo-50 hover:text-indigo-600"
            )}
            title="Copia titolo"
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
          {ago && (
            <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap flex-shrink-0">{ago}</span>
          )}
        </div>
      </div>
      <p className="text-[13px] font-semibold text-slate-800 leading-snug line-clamp-3 group-hover:text-indigo-700 transition-colors pr-2">
        {item.title}
      </p>
      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
        <ExternalLink size={10} />
        <span className="truncate">{new URL(item.url).hostname.replace("www.", "")}</span>
      </div>
    </a>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function TrendMonitor({ onAddToPiano }) {
  const [activecat, setActiveCat] = useState("all");
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError]         = useState(null);
  const [feedsCount, setFeedsCount] = useState(0);

  const fetchTrends = useCallback(async (cat = activecat) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/rss-trends?cat=${cat}&limit=5`);
      if (!res.ok) throw new Error(`Errore API: ${res.status}`);
      const data = await res.json();
      setItems(data.items || []);
      setFetchedAt(new Date(data.fetchedAt));
      setFeedsCount(data.feedsAttempted || 0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [activecat]);

  useEffect(() => {
    fetchTrends(activecat);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activecat]);

  // Conteggi per categoria
  const counts = items.reduce((acc, item) => {
    acc[item.cat] = (acc[item.cat] || 0) + 1;
    return acc;
  }, {});

  const formatTime = (d) => d ? d.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" }) : "";

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <Rss size={18} className="text-white" />
            </div>
            Trend Monitor
          </h2>
          <p className="text-slate-500 text-sm mt-0.5 ml-11">
            Ultime notizie dai competitor · {feedsCount} feed monitorati
            {fetchedAt && <span className="ml-2 text-slate-400">· aggiornato alle {formatTime(fetchedAt)}</span>}
          </p>
        </div>
        <button
          onClick={() => fetchTrends(activecat)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          Aggiorna
        </button>
      </div>

      {/* Filtri categoria */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map(cat => {
          const count = cat.id === "all" ? items.length : (counts[cat.id] || 0);
          const isActive = activecat === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all",
                isActive
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20"
                  : "bg-white text-slate-600 border-slate-200 hover:border-indigo-200 hover:text-indigo-600"
              )}
            >
              {cat.emoji && <span>{cat.emoji}</span>}
              {cat.label}
              {count > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                )}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-medium">
          ⚠️ {error} — alcuni feed potrebbero essere temporaneamente offline.
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {loading
          ? Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)
          : items.length === 0
            ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400">
                <Globe size={48} className="mb-4 opacity-30" />
                <p className="font-semibold">Nessun articolo trovato</p>
                <p className="text-sm mt-1">I feed potrebbero essere temporaneamente offline</p>
              </div>
            )
            : items.map((item, i) => <TrendCard key={`${item.url}-${i}`} item={item} onAddToPiano={onAddToPiano} />)
        }
      </div>

      {/* Footer info */}
      {!loading && items.length > 0 && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <TrendingUp size={12} />
            {items.length} articoli da {feedsCount} fonti — aggiornamento ogni 15 minuti su Vercel
          </span>
        </div>
      )}
    </div>
  );
}
