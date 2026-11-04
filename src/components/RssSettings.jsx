import { useState } from "react";
import { Rss } from "lucide-react";
import { importRssFeeds } from "../utils/rssSettings";

export default function RssSettings({ feeds, onChange }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function handleFile(event) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;

    setImporting(true);
    setError("");
    setResult(null);
    try {
      const imported = await importRssFeeds(file);
      onChange(imported.feeds);
      setResult(imported);
    } catch (error) {
      setError(error.message);
    } finally {
      input.value = "";
      setImporting(false);
    }
  }

  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-indigo-700">Impostazioni</p>
        <h2 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
          <Rss size={22} aria-hidden="true" /> Fonti RSS
        </h2>
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <label htmlFor="rss-opml" className="block font-semibold text-slate-900">Importa file OPML</label>
        <p id="rss-help" className="text-sm text-slate-600">
          Scegli un file .opml o .xml. Le fonti vengono aggiunte a quelle già salvate in questo browser e i duplicati vengono saltati.
        </p>
        <input id="rss-opml" type="file" accept=".opml,.xml,text/xml,application/xml,text/x-opml"
          aria-describedby="rss-help" onChange={handleFile} disabled={importing}
          className="block w-full min-w-0 text-sm text-slate-600 file:mr-2 file:min-h-11 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-3 file:font-semibold file:text-indigo-700" />
        {importing && <p role="status">Importazione in corso…</p>}
        {result && (
          <p role="status" className="text-sm text-emerald-700">
            Feed aggiunti: {result.added} · Duplicati saltati: {result.duplicates}
            {result.invalid > 0 && ` · Indirizzi non validi: ${result.invalid}`}
          </p>
        )}
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
      </div>
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <h3 className="font-semibold text-slate-900">Fonti importate ({feeds.length})</h3>
        {feeds.length === 0 ? (
          <p className="text-sm text-slate-600">Nessuna fonte importata.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {feeds.map(feed => (
              <li key={feed.url} className="space-y-1 py-3 [overflow-wrap:anywhere]">
                <p className="font-medium text-slate-900">{feed.name}</p>
                <p className="text-sm text-slate-600">{feed.url}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
