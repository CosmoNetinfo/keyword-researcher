import { useState } from "react";
import { safeEditorialUrl } from "../utils/editorialRadar";
import { downloadSeoMarkdown, opportunityReasons } from "../utils/exportSeo";

export default function SeoOpportunities({ accessToken, onAddToPiano, onSnapshot }) {
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState("");
  const [added, setAdded] = useState(new Set());

  async function load() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gsc-service", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "opportunities" }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || `Errore API (${response.status})`);
      setResult(data);
      onSnapshot({ ...data, fetchedAt: new Date().toISOString() });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function save(row) {
    setPending(row.url);
    try {
      const saved = await onAddToPiano({
        titolo: `Aggiorna ${new URL(row.url).pathname}`,
        link_fonte: row.url,
        tipo: "Aggiornamento",
        fonte: "Search Console",
        note: opportunityReasons(row).join(" · "),
      });
      if (saved) setAdded(current => new Set(current).add(row.url));
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-bold text-white">Opportunità di aggiornamento</h3>
          <p className="text-sm text-slate-300">Confronta due periodi di 28 giorni e individua le pagine in calo o con molte impressioni e pochi clic.</p>
        </div>
        <button type="button" onClick={load} disabled={loading} className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50">
          {loading ? "Analisi in corso…" : "Analizza opportunità"}
        </button>
      </div>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {result && (
        <>
          <p className="text-xs text-slate-400">
            {result.current.startDate} – {result.current.endDate} rispetto a {result.previous.startDate} – {result.previous.endDate}
          </p>
          {result.rows.length === 0 && <p className="text-sm text-slate-300">Nessuna opportunità trovata nelle pagine analizzate.</p>}
          {result.rows.some(row => safeEditorialUrl(row.url)) && (
            <button type="button" onClick={() => downloadSeoMarkdown(result)}
              className="min-h-11 rounded-xl border border-indigo-400/50 px-3 text-sm font-semibold text-indigo-200">
              Scarica tutte (.md)
            </button>
          )}
          <ul className="space-y-2">
            {result.rows.map(row => {
              const url = safeEditorialUrl(row.url);
              if (!url) return null;
              return (
                <li key={url} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-800 p-3 text-sm">
                  <div className="min-w-0 space-y-1 [overflow-wrap:anywhere]">
                    <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">{new URL(url).pathname}</a>
                    <p className="text-slate-300">
                      {row.lostClicks > 0 && `−${row.lostClicks} clic · `}
                      {row.impressions} impressioni · CTR {(row.ctr * 100).toFixed(1)}% · Pos. {row.position.toFixed(1)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => downloadSeoMarkdown(result, row)}
                      aria-label={`Scarica opportunità per ${new URL(url).pathname} (.md)`}
                      className="min-h-11 rounded-xl border border-indigo-400/50 px-3 text-sm font-semibold text-indigo-200">
                      Scarica .md
                    </button>
                    <button type="button" disabled={Boolean(pending) || added.has(row.url)} onClick={() => save(row)}
                      className="min-h-11 rounded-xl border border-indigo-400/50 px-3 text-sm font-semibold text-indigo-200 disabled:opacity-50">
                      {added.has(row.url) ? "Nel Piano" : "Aggiungi al Piano"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
