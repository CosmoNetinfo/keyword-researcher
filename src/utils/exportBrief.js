import { buildNewsMarkdown, downloadMarkdown, escapeText } from "./exportNews";
import { safeEditorialUrl } from "./editorialRadar";

export function buildEditorialBrief(opportunity) {
  const { lead, sources, existing, queries, action, reason } = opportunity;
  return [
    `# Brief editoriale · ${escapeText(lead.title)}`, "",
    "## Angolo editoriale", "",
    `- ${escapeText(action)}`,
    `- Motivo: ${escapeText(reason)}`, "",
    "## Articoli correlati nel piano", "",
    ...(existing.length ? existing.map(item => {
      const url = safeEditorialUrl(item.url);
      const title = escapeText(item.title);
      return `- ${url ? `[${title}](<${url}>)` : title} · ${escapeText(item.status)}`;
    }) : ["- Nessuna corrispondenza trovata."]), "",
    "## Query pertinenti da Search Console", "",
    ...(queries.length ? queries.map(row => `- ${escapeText(row.query)} · ${row.impressions} impressioni · ${row.clicks} clic`)
      : ["- Nessuna query pertinente nei dati sincronizzati."]), "",
    "## Verifiche prima della stesura", "",
    "- [ ] Individuare la fonte primaria e verificare la data dell'annuncio.",
    "- [ ] Controllare i fatti, le versioni e i nomi citati nei materiali.",
    "- [ ] Confermare l'azione editoriale e i link interni.", "",
    buildNewsMarkdown(sources).replace(/^# CosmoNet[^\n]*/, "## Fonti da consultare"),
  ].join("\n");
}

export function downloadEditorialBrief(opportunity) {
  downloadMarkdown(buildEditorialBrief(opportunity), `cosmonet-brief-${new Date().toISOString().slice(0, 10)}.md`);
}
