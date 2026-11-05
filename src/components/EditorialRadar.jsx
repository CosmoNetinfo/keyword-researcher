import { buildEditorialRadar, safeEditorialUrl } from "../utils/editorialRadar";
import { buildEditorialBrief, downloadEditorialBrief } from "../utils/exportBrief";

export default function EditorialRadar({ items, pianoItems, keywords, onOpenGsc, onArchiveBrief }) {
  const opportunities = buildEditorialRadar(items, pianoItems, keywords);

  return (
    <section aria-labelledby="editorial-radar-title" className="space-y-4">
      <div>
        <h3 id="editorial-radar-title" className="text-xl font-bold text-slate-900">Radar editoriale</h3>
        <p className="text-sm text-slate-600">Le notizie del periodo vengono accorpate per somiglianza dei titoli e confrontate con il Piano Editoriale.</p>
        {keywords.length === 0 && (
          <button type="button" onClick={onOpenGsc} className="min-h-11 text-sm font-semibold text-indigo-700">
            Apri GSC Insights per sincronizzare le query
          </button>
        )}
      </div>
      {opportunities.length === 0 && <p className="rounded-2xl border border-slate-200 bg-white p-4 text-slate-600">Nessuna opportunità dalle notizie del periodo.</p>}
      {opportunities.map(opportunity => (
        <article key={opportunity.lead.url} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 [overflow-wrap:anywhere]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-indigo-700">{opportunity.action}</p>
              <h4 className="font-bold text-slate-900">{opportunity.lead.title}</h4>
              <p className="text-sm text-slate-600">{opportunity.reason}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => onArchiveBrief({ title: opportunity.lead.title, markdown: buildEditorialBrief(opportunity), source: "radar" })}
                className="min-h-11 rounded-xl border border-indigo-200 px-4 text-sm font-bold text-indigo-700">
                Salva nell'archivio
              </button>
            <button type="button" onClick={() => downloadEditorialBrief(opportunity)}
              className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
              Scarica brief (.md)
            </button>
            </div>
          </div>
          <details className="text-sm text-slate-700">
            <summary className="min-h-8 cursor-pointer font-semibold">Fonti da verificare ({opportunity.sources.length})</summary>
            <ul className="list-disc space-y-2 pl-5">
              {opportunity.sources.map(source => (
                <li key={source.url}>
                  <a href={safeEditorialUrl(source.url)} target="_blank" rel="noreferrer" className="text-indigo-700 underline">
                    {source.sourceName} · {source.title}
                  </a>
                </li>
              ))}
            </ul>
          </details>
          {opportunity.existing.length > 0 && (
            <ul aria-label="Articoli correlati" className="space-y-1 text-sm text-slate-600">
              {opportunity.existing.map((item, index) => (
                <li key={index}>{item.status} · {item.url ? <a href={item.url} target="_blank" rel="noreferrer" className="text-indigo-700 underline">{item.title}</a> : item.title}</li>
              ))}
            </ul>
          )}
          {opportunity.queries.length > 0 && (
            <p className="text-sm text-slate-600">Query GSC: {opportunity.queries.map(row => row.query).join(" · ")}</p>
          )}
        </article>
      ))}
    </section>
  );
}
