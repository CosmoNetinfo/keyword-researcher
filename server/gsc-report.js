const PROPERTY = "https://www.cosmonet.info/";
const PAGE_SIZE = 25_000;

export async function readSearchRows(searchconsole, period, dimensions) {
  const rows = [];
  for (let startRow = 0; ; startRow += PAGE_SIZE) {
    const { data } = await searchconsole.searchanalytics.query({
      siteUrl: PROPERTY,
      requestBody: { ...period, dimensions, rowLimit: PAGE_SIZE, startRow, dataState: "final" },
    });
    const page = data.rows || [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

async function wordpress(path, params) {
  const url = new URL(path, PROPERTY);
  url.search = new URLSearchParams(params);
  const response = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!response.ok) throw new Error("WordPress non disponibile");
  return response.json();
}

export async function wordpressPageMetadata(urls) {
  const candidates = new Map();
  for (const value of urls) {
    try {
      const url = new URL(value);
      if (url.origin !== new URL(PROPERTY).origin) continue;
      const slug = decodeURIComponent(url.pathname.split("/").filter(Boolean).at(-1) || "");
      if (slug) candidates.set(url.pathname.replace(/\/$/, ""), slug);
    } catch { /* URL incompleto: classificazione da verificare. */ }
  }
  if (!candidates.size) return new Map();

  const newsIds = new Set((await wordpress("/wp-json/wp/v2/categories", {
    slug: "news,notizie,attualita,novita", _fields: "id",
  }).catch(() => [])).map(category => category.id));
  const slugs = [...new Set(candidates.values())];
  const batches = [];
  for (let i = 0; i < slugs.length; i += 30) batches.push(slugs.slice(i, i + 30));
  const found = new Map();
  for (let i = 0; i < batches.length; i += 4) {
    const reports = await Promise.all(batches.slice(i, i + 4).map(batch =>
      wordpress("/wp-json/wp/v2/posts", {
        slug: batch.join(","), per_page: "100", _fields: "link,date_gmt,categories",
      }).catch(() => [])
    ));
    for (const post of reports.flat()) {
      if (!post.link) continue;
      const path = new URL(post.link).pathname.replace(/\/$/, "");
      if (candidates.has(path)) {
        found.set(path, { date: post.date_gmt ? post.date_gmt + "Z" : null, newsCategory: post.categories?.some(id => newsIds.has(id)) || false });
      }
    }
  }
  return found;
}
