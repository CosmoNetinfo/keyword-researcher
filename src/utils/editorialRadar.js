const STOP_WORDS = new Set("a ad al alla anche and annuncia con da dal dei del della di for from gli has il in is it la le lo new nuova nuovo of on per piu released release si su the to un una with".split(" "));

const STATUS = {
  pubblicato: "Pubblicato",
  programmato: "Programmato",
  in_lavorazione: "In corso",
  da_scrivere: "Da scrivere",
};

function terms(value = "") {
  return new Set(String(value).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
    .split(/[^\p{L}\p{N}]+/u).filter(word => word.length >= 2 && !STOP_WORDS.has(word)));
}

function similarity(left, right) {
  let shared = 0;
  for (const word of left) if (right.has(word)) shared++;
  return shared >= 2 ? shared / Math.max(left.size, right.size) : 0;
}

export function safeEditorialUrl(value) {
  try {
    const url = new URL(value);
    if (["http:", "https:"].includes(url.protocol)) return url.href;
  } catch { /* A link is optional. */ }
  return "";
}

function canonicalLink(value) {
  const link = safeEditorialUrl(value);
  if (!link) return "";
  const url = new URL(link);
  url.hash = "";
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith("utm_")) url.searchParams.delete(key);
  }
  return url.href;
}

export function buildEditorialRadar(items, pianoItems, keywords) {
  const groups = [];
  const seen = new Set();
  for (const item of [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
    const url = canonicalLink(item.url);
    if (!url || seen.has(url)) continue;
    seen.add(url);

    const titleTerms = terms(item.title);
    const group = groups.find(candidate => similarity(candidate.terms, titleTerms) >= 0.6);
    if (group) group.sources.push(item);
    else groups.push({ lead: item, terms: titleTerms, sources: [item] });
  }

  const editorial = pianoItems.map(item => ({
    item,
    terms: terms(item.title),
    source: canonicalLink(item.sourceUrl),
  }));
  const queries = keywords.filter(row => row.keys?.[0]).map(row => ({ row, terms: terms(row.keys[0]) }));

  return groups.map(group => {
    const links = new Set(group.sources.map(item => canonicalLink(item.url)));
    const matches = editorial.map(entry => ({
      item: entry.item,
      score: links.has(entry.source) ? 2 : similarity(entry.terms, group.terms),
    })).filter(entry => entry.score >= 0.5).sort((a, b) => b.score - a.score);
    const existing = matches.slice(0, 3).map(({ item }) => ({
      title: item.title,
      status: STATUS[item.status] || "Nel piano",
      url: safeEditorialUrl(item.existingUrl || item.wpUrl || item.publishedUrl),
    }));
    const exact = matches.find(entry => entry.score === 2);
    const published = matches.find(entry => entry.item.status === "pubblicato");
    const scheduled = matches.find(entry => entry.item.status === "programmato");
    const target = exact || scheduled || published || matches[0];
    let action = "Valuta un nuovo articolo";
    let reason = "Nessun titolo simile trovato nel Piano Editoriale.";
    if (target) {
      if (exact) action = "Rivedi la scheda esistente";
      else if (scheduled) action = "Valuta se anticipare il pezzo";
      else if (published) action = "Valuta un aggiornamento";
      else action = "Integra la scheda esistente";
      reason = `${STATUS[target.item.status] || "Nel piano"} · ${target.item.title}`;
    }
    const relevantQueries = queries.filter(({ terms: queryTerms }) => {
      const shared = [...queryTerms].filter(word => group.terms.has(word)).length;
      return shared >= 2 && shared / queryTerms.size >= 0.6;
    }).map(({ row }) => ({
      query: row.keys[0], clicks: row.clicks, impressions: row.impressions,
    })).sort((a, b) => b.impressions - a.impressions).slice(0, 5);

    return { lead: group.lead, sources: group.sources, existing, action, reason, queries: relevantQueries };
  });
}
