import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { safeEditorialUrl } from "../utils/editorialRadar";
import { downloadSeoMarkdown, formatSeoMetrics, opportunityReasons, SEO_SECTIONS } from "../utils/exportSeo";
import { isGscExpired } from "../utils/gscSession";
import { SEO_DEFAULTS } from "../utils/seoOpportunities";

const FIELDS = { impressions: "Impressioni minime", position: "Posizione massima", ctr: "CTR massimo (%)",
  clicksLost: "Clic persi minimi", lossPercent: "Perdita minima (%)" };
const BUTTON = "min-h-11 rounded-xl border border-indigo-400/50 px-3 text-sm font-semibold text-indigo-200 disabled:opacity-50";

export default function SeoOpportunities({ accessToken, onAddToPiano, onSnapshot, onSessionExpired, classifications }) {
  const [result, setResult] = useState(null);
  const [thresholds, setThresholds] = useState(SEO_DEFAULTS);
  const [structural, setStructural] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState("");
  const [added, setAdded] = useState(new Set());
  const report = result && { ...result, rows: result.rows.map(row => ({
    ...row, classification: classifications[encodeURIComponent(row.url)] || row.classification,
  })) };

  async function load(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/gsc-service", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ action: "opportunities", thresholds, structuralTerms: structural.split(",") }),
      });
      const data = await response.json();
      if (sessionStorage.getItem("gsc_access_token") !== accessToken) return;
      if (isGscExpired(response, data)) return onSessionExpired();
      if (!response.ok) throw new Error(data.error || `Errore API (${response.status})`);
      setResult(data);
      onSnapshot({ ...data, rows: data.rows.slice(0, 30).map(row => ({
        ...row, structuralQueries: row.structuralQueries.slice(0, 10),
      })), cannibalization: data.cannibalization.slice(0, 10).map(pair => ({
        ...pair, queries: pair.queries.slice(0, 10),
      })), fetchedAt: new Date().toISOString() });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function classify(url, value) {
    setError("");
    try {
      await setDoc(doc(db, "seo_settings", auth.currentUser.uid), {
        classifications: { [encodeURIComponent(url)]: value || null },
      }, { merge: true });
    } catch (error) {
      setError(error.message);
    }
  }

  async function save(row) {
    setPending(row.url);
    try {
      const saved = await onAddToPiano({
        titolo: `Aggiorna ${new URL(row.url).pathname}`, link_fonte: row.url,
        tipo: "Aggiornamento", fonte: "Search Console", note: opportunityReasons(row).join(" · "),
      });
      if (saved) setAdded(current => new Set(current).add(row.url));
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
      <h3 className="font-bold text-white">Opportunità di aggiornamento</h3>
      <form onSubmit={load} className="space-y-3">
        <details className="space-y-3">
          <summary className="cursor-pointer font-semibold">Soglie e query strutturali</summary>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(FIELDS).map(([key, label]) => (
              <label key={key} className="min-w-0 text-sm">{label}
                <input type="number" min="0.01" step="any" required className="mt-1 block w-full rounded-lg bg-slate-800 p-2"
                  value={thresholds[key]} onChange={event => setThresholds({ ...thresholds, [key]: event.target.value === "" ? "" : Number(event.target.value) })} />
              </label>
            ))}
          </div>
          <label className="block text-sm">Altri brand, prodotti o refusi noti, separati da virgola
            <input value={structural} onChange={event => setStructural(event.target.value)} className="mt-1 block w-full rounded-lg bg-slate-800 p-2" />
          </label>
        </details>
        <button disabled={loading} className={BUTTON}>{loading ? "Analisi in corso…" : "Analizza opportunità"}</button>
      </form>
      {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
      {report && (
        <>
          <p className="text-sm text-slate-300">
            Corrente {report.current.startDate} – {report.current.endDate} · Precedente {report.previous.startDate} – {report.previous.endDate}.
            Righe lette: {report.counts.current} pagine correnti, {report.counts.previous} precedenti e {report.counts.queryPages} query/pagina.
          </p>
          <button type="button" onClick={() => downloadSeoMarkdown(report)} className={BUTTON}
            disabled={!report.rows.length && !report.cannibalization.length}>Esporta report Markdown</button>
          {SEO_SECTIONS.map(([label, filter, action]) => (
            <details key={label} className="space-y-2" open={label === SEO_SECTIONS[0][0] ? true : undefined}>
              <summary className="cursor-pointer font-semibold">{label} ({report.rows.filter(filter).length})</summary>
              <ul className="space-y-2">
                {report.rows.filter(filter).map(row => {
                  const url = safeEditorialUrl(row.url);
                  if (!url) return null;
                  return (
                    <li key={url} className="space-y-2 rounded-xl border border-slate-700 p-3 text-sm [overflow-wrap:anywhere]">
                      <a href={url} target="_blank" rel="noreferrer" className="font-semibold text-indigo-300 underline">{new URL(url).pathname}</a>
                      <p>Corrente · {formatSeoMetrics(row.current)}</p>
                      <p>Precedente · {formatSeoMetrics(row.previous)}</p>
                      {row.missing && <p>Pagina assente nelle righe correnti.</p>}
                      <p>{row.classification} · {action}</p>
                      {row.declineLabel && <p className="font-semibold text-amber-300">{row.declineLabel}</p>}
                      {label === "CTR basso strutturale" && <ul>{row.structuralQueries.map(query => (
                        <li key={query.query}>{query.query} · {formatSeoMetrics(query)}</li>
                      ))}</ul>}
                      <label className="flex flex-wrap items-center gap-2">Classificazione manuale
                        <select value={classifications[encodeURIComponent(row.url)] || ""} onChange={event => classify(row.url, event.target.value)}
                          className="rounded-lg bg-slate-800 p-2">
                          <option value="">Automatica</option><option value="evergreen">Evergreen</option><option value="news">News</option>
                        </select>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        <button type="button" onClick={() => downloadSeoMarkdown(report, row)} className={BUTTON}>Scarica .md</button>
                        {row.classification === "evergreen" && <button type="button" className={BUTTON}
                          disabled={Boolean(pending) || added.has(row.url)} onClick={() => save(row)}>
                          {added.has(row.url) ? "Nel Piano" : "Aggiungi al Piano"}
                        </button>}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </details>
          ))}
          <details className="space-y-2">
            <summary className="cursor-pointer font-semibold">Cannibalizzazione ({report.cannibalization.length})</summary>
            {report.cannibalization.map(pair => (
              <article key={pair.pages.join("|")} className="space-y-1 rounded-xl border border-slate-700 p-3 text-sm [overflow-wrap:anywhere]">
                {pair.pages.map((page, index) => <p key={page}>{page} · {pair.clicks[index]} clic</p>)}
                <p>Principale: {pair.primary}</p><p>{pair.action}</p>
                <ul>{pair.queries.map(item => <li key={item.query}>{item.query} · {item.metrics.map(metric => `${metric.impressions} impr., pos. ${metric.position.toFixed(1)}`).join(" / ")}</li>)}</ul>
              </article>
            ))}
          </details>
        </>
      )}
    </section>
  );
}
