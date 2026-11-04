import { normalizeFeedUrl } from "./feedUrl";

const STORAGE_KEY = "kr_rss_feeds";

export function readRssFeeds() {
  try {
    const feeds = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(feeds) ? feeds : [];
  } catch {
    return [];
  }
}

export async function importRssFeeds(file) {
  if (!/\.(opml|xml)$/i.test(file.name)) {
    throw new Error("Scegli un file con estensione .opml o .xml.");
  }

  const xml = new DOMParser().parseFromString(await file.text(), "application/xml");
  const body = xml.documentElement.querySelector(":scope > body");
  if (xml.documentElement.localName !== "opml" || !body || xml.querySelector("parsererror")) {
    throw new Error("Il file non contiene un elenco OPML valido.");
  }

  const imported = readRssFeeds();
  const knownUrls = new Set(imported.map(feed => feed.url));
  let added = 0;
  let duplicates = 0;
  let invalid = 0;

  for (const outline of body.querySelectorAll("outline[xmlUrl]")) {
    const url = normalizeFeedUrl(outline.getAttribute("xmlUrl").trim());
    if (!url) {
      invalid++;
    } else if (knownUrls.has(url)) {
      duplicates++;
    } else {
      const name = outline.getAttribute("title")?.trim() || outline.getAttribute("text")?.trim() || new URL(url).hostname;
      imported.push({ url, name });
      knownUrls.add(url);
      added++;
    }
  }

  if (!added && !duplicates) throw new Error("Il file OPML non contiene feed HTTP o HTTPS validi.");
  if (added) localStorage.setItem(STORAGE_KEY, JSON.stringify(imported));
  return { feeds: imported, added, duplicates, invalid };
}
