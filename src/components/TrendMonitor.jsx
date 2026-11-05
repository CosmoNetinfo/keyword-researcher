import { useState, useEffect, useCallback } from "react";
import { ExternalLink, RefreshCw, Rss, Globe, TrendingUp, Copy, Check, Settings } from "lucide-react";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { downloadNewsMarkdown } from "../utils/exportNews";
import { RSS_BATCH_SIZE } from "../utils/feedUrl";
import EditorialRadar from "./EditorialRadar";
import { groupRecentNews } from "../utils/trendPreferences";

function cn(...inputs) { return twMerge(clsx(inputs)); }

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
function TrendCard({ item, hue, onAddToPiano, selected, onToggleSelected }) {
  const [copied, setCopied] = useState(false);
  const [isAdded, setIsAdded] = useState(false);
  const ago = timeAgo(item.date);

  const handleCopy = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(item.title);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <article
      className="group block min-w-0 bg-white rounded-2xl border border-l-4 border-slate-200 p-4 hover:shadow-md transition-all duration-200 relative"
      style={{ borderLeftColor: `hsl(${hue} 65% 44%)` }}
    >
      <label className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-600 cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onToggleSelected(item)}
          aria-label={`Seleziona per esportazione: ${item.title}`}
          className="h-4 w-4 accent-indigo-600"
        />
        Includi nel file .md
      </label>
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <span className="min-w-0 truncate rounded-full px-2 py-0.5 text-[10px] font-bold"
          style={{ backgroundColor: `hsl(${hue} 72% 92%)`, color: `hsl(${hue} 66% 26%)` }}>
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
                categoria: "oss"
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
      <a href={item.url} target="_blank" rel="noreferrer" className="block text-[13px] font-semibold text-slate-800 leading-snug line-clamp-3 hover:text-indigo-700 transition-colors pr-2">
        {item.title}
      </a>
      <div className="mt-3 flex items-center gap-1 text-[10px] text-slate-400 font-medium">
        <ExternalLink size={10} />
        <span className="truncate">{new URL(item.url).hostname.replace("www.", "")}</span>
      </div>
    </article>
  );
}

// ─── Componente principale ────────────────────────────────────────────────────
export default function TrendMonitor({ onAddToPiano, feeds, hours, pianoItems, keywords, onOpenGsc, onArchiveBrief, onOpenSettings, onOpenSources }) {
  const [showRadar, setShowRadar] = useState(false);
  const [source, setSource] = useState("");
  const [items, setItems]         = useState([]);
  const [loading, setLoading]     = useState(false);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [error, setError]         = useState(null);
  const [now, setNow] = useState(Date.now);
  const groups = groupRecentNews(items, feeds, source, hours, now);
  const visibleItems = groups.flatMap(group => group.items);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);
  const [selectedItems, setSelectedItems] = useState(new Map());

  const toggleSelected = (item) => {
    setSelectedItems(current => {
      const next = new Map(current);
      if (next.has(item.url)) next.delete(item.url);
      else next.set(item.url, item);
      return next;
    });
  };

  const selectVisible = () => {
    setSelectedItems(current => {
      const next = new Map(current);
      for (const item of visibleItems) next.set(item.url, item);
      return next;
    });
  };

  const fetchTrends = useCallback(async (signal) => {
    if (!feeds.length) return;
    setLoading(true);
    setError(null);
    try {
      const requests = [];
      for (let start = 0; start < feeds.length; start += RSS_BATCH_SIZE) {
        requests.push(fetch("/api/trend-service?action=rss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ feeds: feeds.slice(start, start + RSS_BATCH_SIZE) }),
          signal,
        }).then(res => {
          if (!res.ok) throw new Error(`Errore API: ${res.status}`);
          return res.json();
        }));
      }
      const batches = await Promise.all(requests);
      if (signal?.aborted) return;
      const news = batches.flatMap(batch => batch.items);
      news.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
      setItems(news);
      const fetched = Date.now();
      setNow(fetched);
      setFetchedAt(new Date(fetched));
    } catch (error) {
      if (!signal?.aborted) setError(error.message);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [feeds]);

  useEffect(() => {
    const controller = new AbortController();
    fetchTrends(controller.signal);
    return () => controller.abort();
  }, [fetchTrends]);

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
            Ultime {hours} ore · {feeds.length} feed monitorati
            {fetchedAt && <span className="ml-2 text-slate-400">· aggiornato alle {formatTime(fetchedAt)}</span>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={onOpenSettings}
            className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600">
            <Settings size={16} aria-hidden="true" /> Impostazioni
          </button>
        <button
          onClick={() => fetchTrends()}
          disabled={loading || !feeds.length}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          Aggiorna
        </button>
        </div>
      </div>

      <div role="group" aria-label="Vista Trend Monitor" className="flex flex-wrap gap-2">
        {["Notizie", "Radar editoriale"].map((label, index) => (
          <button type="button" key={label} aria-pressed={showRadar === Boolean(index)}
            onClick={() => setShowRadar(Boolean(index))}
            className={cn("min-h-11 rounded-xl border px-4 text-sm font-bold",
              showRadar === Boolean(index) ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600")}>
            {label}
          </button>
        ))}
      </div>

      {feeds.length > 0 && (
        <div className="max-w-sm space-y-1 text-sm font-semibold text-slate-700">
          <label htmlFor="trend-source" className="block">Fonte</label>
          <select id="trend-source" value={source} onChange={event => setSource(event.target.value)}
            className="block min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3">
            <option value="">Tutte le fonti</option>
            {feeds.map(feed => <option key={feed.url} value={feed.url}>{feed.name}</option>)}
          </select>
        </div>
      )}

      {!showRadar && (
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <p role="status" className="text-sm font-semibold text-indigo-900 mr-auto">
              {selectedItems.size} notizie selezionate
            </p>
            <button type="button" onClick={selectVisible} disabled={loading || visibleItems.length === 0}
              className="text-sm font-semibold text-indigo-700 disabled:opacity-50">
              Seleziona tutte le notizie mostrate
            </button>
            <button type="button" onClick={() => setSelectedItems(new Map())} disabled={selectedItems.size === 0}
              className="text-sm font-semibold text-slate-600 disabled:opacity-50">
              Svuota selezione
            </button>
            <button type="button" onClick={() => downloadNewsMarkdown([...selectedItems.values()])}
              disabled={selectedItems.size === 0}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
              Scarica selezionate (.md)
            </button>
          </div>
          <p className="text-xs text-indigo-700">La selezione viene mantenuta quando cambi fonte o aggiorni le notizie. Il file contiene titolo, fonte, data e link originale.</p>
          {selectedItems.size > 0 && (
            <details className="text-sm text-slate-700">
              <summary className="cursor-pointer font-semibold">Rivedi la selezione</summary>
              <ul className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {[...selectedItems.values()].map(item => (
                  <li key={item.url} className="flex items-center gap-3">
                    <span className="mr-auto">{item.title}</span>
                    <button type="button" onClick={() => toggleSelected(item)}
                      aria-label={`Rimuovi dalla selezione: ${item.title}`} className="text-indigo-700 font-semibold">Rimuovi</button>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-700 text-sm font-medium">
          ⚠️ {error} — alcuni feed potrebbero essere temporaneamente offline.
        </div>
      )}

      {/* Grid */}
      <div className="space-y-6">
        {loading
          ? <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          : visibleItems.length === 0
            ? (
              <div className="col-span-full flex flex-col items-center justify-center py-24 text-slate-400">
                <Globe size={48} className="mb-4 opacity-30" />
                {feeds.length === 0 ? (
                  <>
                    <p className="font-semibold">Nessuna fonte RSS importata</p>
                    <button type="button" onClick={onOpenSources}
                      className="mt-2 min-h-11 rounded-xl bg-indigo-50 px-4 text-sm font-semibold text-indigo-700">
                      Apri Impostazioni · Fonti RSS
                    </button>
                  </>
                ) : (
                  <p className="font-semibold">Nessun articolo nelle ultime {hours} ore</p>
                )}
              </div>
            )
            : showRadar ? (
              <EditorialRadar items={visibleItems} pianoItems={pianoItems} keywords={keywords} onOpenGsc={onOpenGsc} onArchiveBrief={onArchiveBrief} />
            ) : groups.map(group => (
              <section key={group.domain} aria-label={group.name}
                className="min-w-0 space-y-3 rounded-2xl border p-3 sm:p-4"
                style={{ backgroundColor: `hsl(${group.hue} 65% 97%)`, borderColor: `hsl(${group.hue} 55% 84%)` }}>
                <h3 className="flex flex-wrap items-baseline gap-x-3 text-base font-bold [overflow-wrap:anywhere]"
                  style={{ color: `hsl(${group.hue} 66% 26%)` }}>
                  {group.name}
                  <span className="text-xs font-medium">{group.items.length} {group.items.length === 1 ? "notizia" : "notizie"}</span>
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {group.items.map((item, i) => (
                    <TrendCard key={`${item.url}-${i}`} item={item} hue={group.hue} onAddToPiano={onAddToPiano}
                      selected={selectedItems.has(item.url)} onToggleSelected={toggleSelected} />
                  ))}
                </div>
              </section>
            ))
        }
      </div>

      {/* Footer info */}
      {!loading && visibleItems.length > 0 && (
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <TrendingUp size={12} />
            {visibleItems.length} articoli
          </span>
        </div>
      )}
    </div>
  );
}
