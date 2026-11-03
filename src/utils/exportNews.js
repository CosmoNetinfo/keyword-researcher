const CATEGORY_LABELS = {
  'tech-it': 'Tecnologia in italiano',
  linux: 'Linux',
  ai: 'Intelligenza artificiale',
  gaming: 'Gaming',
  selfhosted: 'Self-hosting',
  'tech-en': 'Tecnologia, sicurezza e Windows',
};

function escapeText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
    .replace(/([\\`*_{}[\]<>#!|])/g, '\\$1');
}

function formatDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('it-IT', { dateStyle: 'long', timeZone: 'Europe/Rome' }).format(date)
    : 'Non disponibile';
}

export function buildNewsMarkdown(items, exportedAt = new Date()) {
  const unique = [...new Map(items.map(item => [item.url, item])).values()];
  const groups = new Map();
  for (const item of unique) {
    const label = CATEGORY_LABELS[item.cat] || 'Altri argomenti';
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(item);
  }
  const lines = [
    '# CosmoNet — Notizie selezionate', '',
    `Esportazione: ${formatDate(exportedAt)}`,
    `Notizie selezionate: ${unique.length}`, '',
  ];
  for (const [label, articles] of groups) {
    lines.push(`## ${label}`, '');
    for (const item of articles) {
      let link = 'Non disponibile';
      try {
        const url = new URL(item.url);
        if (['http:', 'https:'].includes(url.protocol)) {
          link = `[Apri articolo originale](<${url.href.replace(/</g, '%3C').replace(/>/g, '%3E')}>)`;
        }
      } catch { /* Metadati incompleti: il resto della scheda rimane esportabile. */ }
      lines.push(`### ${escapeText(item.title) || 'Senza titolo'}`, '',
        `- Fonte: ${escapeText(item.sourceName) || 'Non disponibile'}`,
        `- Data di pubblicazione: ${formatDate(item.date)}`,
        `- Link: ${link}`, '');
    }
  }
  return lines.join('\n');
}

export function downloadNewsMarkdown(items) {
  if (!items.length) return;
  const exportedAt = new Date();
  const blob = new Blob([buildNewsMarkdown(items, exportedAt)], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `cosmonet-notizie-${exportedAt.toISOString().slice(0, 10)}.md`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
