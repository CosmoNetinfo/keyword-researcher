import { safeEditorialUrl } from "./editorialRadar.js";
import { downloadMarkdown, escapeText } from "./exportNews.js";

export function opportunityReasons(row) {
  const reasons = [];
  if (row.lostClicks > 0) reasons.push(`${row.lostClicks} clic persi rispetto al periodo precedente`);
  if (row.lowCtr) reasons.push(`CTR basso con ${row.impressions} impressioni`);
  return reasons;
}

export function buildSeoMarkdown({ current, previous, rows }) {
  const lines = [
    "# Opportunità di aggiornamento · Search Console", "",
    `- Periodo analizzato: ${current.startDate} – ${current.endDate}`,
    `- Periodo precedente: ${previous.startDate} – ${previous.endDate}`, "",
  ];

  for (const row of rows) {
    const url = safeEditorialUrl(row.url);
    if (!url) continue;
    lines.push(
      `## ${escapeText(new URL(url).pathname)}`, "",
      `- Pagina: [Apri la pagina](<${url}>)`,
      ...opportunityReasons(row).map(reason => `- Motivo: ${reason}`),
      `- Clic: ${row.clicks}`,
      `- Impressioni: ${row.impressions}`,
      `- CTR: ${(row.ctr * 100).toFixed(1)}%`,
      `- Posizione media: ${row.position.toFixed(1)}`, "",
    );
  }

  return lines.join("\n");
}

export function downloadSeoMarkdown(report, row) {
  const rows = row ? [row] : report.rows.filter(item => safeEditorialUrl(item.url));
  if (!rows.length) return;
  const slug = row && new URL(row.url).pathname.split("/").filter(Boolean).at(-1)
    ?.replace(/[^a-z0-9_-]+/gi, "-").slice(0, 70);
  const name = row ? `aggiornamento-${slug || "pagina"}` : "opportunita-aggiornamento";
  downloadMarkdown(buildSeoMarkdown({ ...report, rows }), `cosmonet-${name}-${report.current.endDate}.md`);
}
