const STORAGE_KEY = "kr_trend_hours";
export const TREND_WINDOWS = [12, 24];

export function readTrendHours() {
  try {
    const hours = Number(localStorage.getItem(STORAGE_KEY));
    return TREND_WINDOWS.includes(hours) ? hours : 24;
  } catch {
    return 24;
  }
}

export function saveTrendHours(hours) {
  localStorage.setItem(STORAGE_KEY, String(hours));
}

const BRANDS = {
  "github.com": { name: "GitHub", hue: 25 },
  "deepmind.google": { name: "Google DeepMind", hue: 199 },
  "openai.com": { name: "OpenAI News", hue: 158 },
};

export function groupRecentNews(items, feeds, selectedFeed, hours, now) {
  const domains = new Map();
  const sources = new Map();
  for (const feed of feeds) {
    const domain = new URL(feed.url).hostname.replace(/^www\./, "");
    sources.set(feed.url, domain);
    if (!domains.has(domain)) {
      domains.set(domain, { domain, name: feed.name, hue: (domains.size * 137.508 + 280) % 360 });
    } else {
      domains.get(domain).name = domain;
    }
  }

  const cutoff = now - hours * 3_600_000;
  const groups = new Map();
  for (const item of items) {
    if (selectedFeed && item.feedUrl !== selectedFeed) continue;
    const date = Date.parse(item.date);
    if (!(date >= cutoff && date <= now)) continue;

    const domain = sources.get(item.feedUrl);
    if (!domain) continue;
    if (!groups.has(domain)) {
      groups.set(domain, { ...domains.get(domain), ...BRANDS[domain], items: [] });
    }
    groups.get(domain).items.push(item);
  }
  return [...groups.values()];
}
