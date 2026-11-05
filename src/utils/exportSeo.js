import { safeEditorialUrl } from "./editorialRadar.js";
import { downloadMarkdown, escapeText } from "./exportNews.js";

export function opportunityReasons(row) {
  const reasons = [];
  if (row.missing && row.lostClicks) reasons.push("Pagina assente nelle righe del periodo corrente");
  else if (row.lostClicks) reasons.push(`${row.lostClicks} clic persi rispetto al periodo precedente`);
  if (row.declineLabel) reasons.push(row.declineLabel);
  if (row.lowCtr) reasons.push("CTR basso");
  return reasons;
}

export const SEO_SECTIONS = [
  ["Pagine evergreen da ottimizzare", row => row.classification === "evergreen" && row.lowCtr, "Rivedi titolo e meta description"],
  ["Pagine in calo da aggiornare", row => row.classification === "evergreen" && row.lostClicks > 0, "Verifica il calo e valuta un aggiornamento"],
  ["CTR basso strutturale", row => row.structuralQueries.length > 0, "Rivedi l’intento delle query strutturali"],
  ["News e pagine da verificare", row => row.classification !== "evergreen", "Verifica il contesto editoriale"],
];

export function formatSeoMetrics(metrics) {
  if (!metrics) return "Dato non restituito";
  return `${metrics.clicks} clic · ${metrics.impressions} impressioni · CTR ${(metrics.ctr * 100).toFixed(1)}% · posizione ${metrics.position.toFixed(1)}`;
}

export function buildSeoMarkdown({ current, previous, rows, cannibalization = [], counts = {} }) {
  const lines = [
    "# Opportunità di aggiornamento", "", "## Riepilogo", "",
    `- Periodo corrente: ${current.startDate} – ${current.endDate}`,
    `- Periodo precedente: ${previous.startDate} – ${previous.endDate}`,
    `- Pagine candidate: ${rows.length} · Coppie in cannibalizzazione: ${cannibalization.length}`, "",
  ];

  for (const [label, include, action] of SEO_SECTIONS) {
    lines.push(`## ${label}`, "");
    const selected = rows.filter(include);
    if (!selected.length) lines.push("Nessun risultato.", "");
    for (const row of selected) {
      const url = safeEditorialUrl(row.url);
      if (!url) continue;
      lines.push(
        `### ${escapeText(new URL(url).pathname)}`, "",
        `- URL: [${escapeText(url)}](<${url}>)`,
        `- Classificazione: ${row.classification}`,
        `- Corrente: ${formatSeoMetrics(row.current)}`,
        `- Precedente: ${formatSeoMetrics(row.previous)}`,
        `- Azione: ${action}`,
        ...opportunityReasons(row).map(reason => `- Motivo: ${reason}`),
        ...(label === "CTR basso strutturale" ? row.structuralQueries.map(item =>
          `- Query: ${escapeText(item.query)} · ${formatSeoMetrics(item)}`) : []), "",
      );
    }
  }
  lines.push("## Cannibalizzazione", "");
  if (!cannibalization.length) lines.push("Nessuna coppia rilevata.", "");
  for (const pair of cannibalization) {
    lines.push(`- ${pair.pages.map(escapeText).join(" / ")}`,
      `  - Principale: ${escapeText(pair.primary)} · ${pair.action}`,
      `  - Query condivise: ${pair.queries.map(item => escapeText(item.query)).join(", ")}`, "");
  }

  lines.push("## Note sui dati", "",
    `- Righe lette: ${counts.current ?? "—"} pagine correnti, ${counts.previous ?? "—"} precedenti, ${counts.queryPages ?? "—"} coppie query/pagina.`,
    "- I conteggi sono le righe originali, prima di raggruppare gli URL senza frammenti ed escludere archivi e paginazione.",
    "- I periodi includono le date indicate e usano il fuso Pacifico.",
    "- Search Console può omettere righe anche con paginazione. Un dato assente non è un valore misurato pari a zero.",
    "- Una pagina è classificata come news se recente o in una categoria di attualità, salvo override manuale.", "");
  return lines.join("\n");
}

export function downloadSeoMarkdown(report, row) {
  const rows = row ? [row] : report.rows.filter(item => safeEditorialUrl(item.url));
  const pairs = row ? report.cannibalization.filter(pair => pair.pages.includes(row.url)) : report.cannibalization;
  if (!rows.length && !pairs.length) return;
  const slug = row && new URL(row.url).pathname.split("/").filter(Boolean).at(-1)
    ?.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 70);
  const name = row ? `aggiornamento-${slug || "pagina"}` : "opportunita-aggiornamento";
  downloadMarkdown(buildSeoMarkdown({ ...report, rows, cannibalization: pairs }), `cosmonet-${name}-${report.current.endDate}.md`);
}
