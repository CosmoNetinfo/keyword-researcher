export const SEO_DEFAULTS = { impressions: 100, position: 10, ctr: 3, clicksLost: 5, lossPercent: 20 };
export const STRUCTURAL_DEFAULTS = ["cosmonet", "cosmonet.info", "keyword researcher", "cosmonett", "cosmnet", "cosmonte"];

export function comparisonPeriods(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const { year, month, day: date } = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const day = new Date(`${year}-${month}-${date}T00:00:00Z`);
  const offset = days => new Date(day.getTime() - days * 86_400_000).toISOString().slice(0, 10);
  return {
    current: { startDate: offset(30), endDate: offset(3) },
    previous: { startDate: offset(58), endDate: offset(31) },
  };
}

export function seoSettings(input) {
  return Object.fromEntries(Object.entries(SEO_DEFAULTS).map(([key, fallback]) => {
    const value = input?.[key];
    return [key, typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback];
  }));
}

function metrics(row) {
  return row ? { clicks: row.clicks, impressions: row.impressions, ctr: row.ctr, position: row.position } : null;
}

function isLowCtr(row, settings) {
  return row && row.impressions >= settings.impressions && row.position <= settings.position && row.ctr < settings.ctr / 100;
}

export function structuralQuery(query, terms) {
  const normalized = query.toLocaleLowerCase("it");
  return terms.some(term => normalized.includes(term.toLocaleLowerCase("it")));
}

export function findSeoOpportunities(current, previous, queryPages = [], input, structuralTerms = STRUCTURAL_DEFAULTS) {
  const settings = seoSettings(input);
  const now = new Map(current.map(row => [row.keys[0], row]));
  const prior = new Map(previous.map(row => [row.keys[0], row]));
  const queries = new Map();
  for (const row of queryPages) {
    const [query, page] = row.keys;
    if (!query || !page || !isLowCtr(row, settings)) continue;
    if (!queries.has(page)) queries.set(page, { actionable: [], structural: [] });
    const kind = structuralQuery(query, structuralTerms) ? "structural" : "actionable";
    queries.get(page)[kind].push({ query, ...metrics(row) });
  }

  return [...new Set([...now.keys(), ...prior.keys(), ...queries.keys()])].flatMap(url => {
    const currentRow = now.get(url);
    const previousRow = prior.get(url);
    const loss = (previousRow?.clicks || 0) - (currentRow?.clicks || 0);
    const declining = previousRow?.clicks > 0 && loss >= settings.clicksLost && loss / previousRow.clicks >= settings.lossPercent / 100;
    const queryData = queries.get(url) || { actionable: [], structural: [] };
    const lowCtr = Boolean(isLowCtr(currentRow, settings) && (!queryData.structural.length || queryData.actionable.length));
    if (!declining && !lowCtr && !queryData.structural.length) return [];
    return [{
      url, current: metrics(currentRow), previous: metrics(previousRow), missing: !currentRow,
      lostClicks: declining ? loss : 0, lowCtr,
      focusKeyphrase: queryData.actionable.sort((a, b) => b.impressions - a.impressions)[0]?.query || "",
      structuralQueries: queryData.structural,
    }];
  }).sort((a, b) => b.lostClicks - a.lostClicks || (b.current?.impressions || 0) - (a.current?.impressions || 0));
}

export function classifyPage(post, override, endDate) {
  if (override === "evergreen" || override === "news") return override;
  if (!post) return "da verificare";
  if (post.newsCategory) return "news";
  const published = Date.parse(post.date);
  const end = Date.parse(endDate + "T23:59:59Z");
  if (!Number.isFinite(published) || !Number.isFinite(end)) return "da verificare";
  return published >= end - 14 * 86_400_000 ? "news" : "evergreen";
}

export function findCannibalization(rows) {
  const byQuery = new Map();
  const pageStats = new Map();
  for (const row of rows) {
    const [query, page] = row.keys;
    if (!query || !page) continue;
    const stats = pageStats.get(page) || { clicks: 0, queries: new Set() };
    stats.clicks += row.clicks;
    if (row.impressions >= 50 && row.position < 20) {
      stats.queries.add(query);
      if (!byQuery.has(query)) byQuery.set(query, new Map());
      byQuery.get(query).set(page, row);
    }
    pageStats.set(page, stats);
  }
  const pairs = new Map();
  for (const [query, entries] of byQuery) {
    const pages = [...entries.keys()].sort();
    for (let i = 0; i < pages.length; i++) {
      for (let j = i + 1; j < pages.length; j++) {
        const pair = [pages[i], pages[j]];
        const key = JSON.stringify(pair);
        if (!pairs.has(key)) pairs.set(key, { pages: pair, queries: [] });
        pairs.get(key).queries.push({ query, metrics: pair.map(page => metrics(entries.get(page))) });
      }
    }
  }
  return [...pairs.values()].filter(pair => pair.queries.length >= 2).map(pair => {
    const [a, b] = pair.pages.map(page => pageStats.get(page));
    const main = a.clicks >= b.clicks ? 0 : 1;
    const shared = pair.queries.length;
    const overlap = shared / Math.min(a.queries.size, b.queries.size);
    const action = overlap === 1 && a.queries.size === b.queries.size ? "Valuta di unire le pagine"
      : overlap < 0.75 ? "Differenzia l’intento"
      : "Aggiungi un link interno verso la pagina principale";
    return { ...pair, primary: pair.pages[main], clicks: [a.clicks, b.clicks], action };
  }).sort((a, b) => b.queries.length - a.queries.length);
}

export function growthRows(current, previous) {
  const prior = new Map(previous.map(row => [JSON.stringify(row.keys), row.impressions]));
  return current.map(row => {
    const before = prior.get(JSON.stringify(row.keys));
    const diff = row.impressions - (before ?? 0);
    return { query: row.keys[0], page: row.keys[1], diff, pct: before > 0 ? diff / before * 100 : null, impressions: row.impressions };
  }).sort((a, b) => b.diff - a.diff).slice(0, 10);
}
