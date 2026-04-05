
// ─── Catalogo Globale Feed RSS ─────────────────────────────────────────────
export const RSS_FEEDS = [
  { url: "https://www.hdblog.it/rss/", name: "HDBlog", cat: "tech-it", lang: "it" },
  { url: "https://www.tomshw.it/feed/", name: "Tom's HW Italia", cat: "tech-it", lang: "it" },
  { url: "https://www.punto-informatico.it/feed/", name: "Punto Informatico", cat: "tech-it", lang: "it" },
  { url: "https://www.wired.it/feed/", name: "Wired Italy", cat: "tech-it", lang: "it" },
  { url: "https://www.miamammausalinux.org/feed/", name: "MiaMammaUsaLinux", cat: "linux", lang: "it" },
  { url: "https://www.intelligenzaartificialeitalia.net/?feed=rss2", name: "IA Italia", cat: "ai", lang: "it" },
  { url: "https://itsfoss.com/feed/", name: "It's FOSS", cat: "linux", lang: "en" },
  { url: "https://9to5linux.com/feed/", name: "9to5Linux", cat: "linux", lang: "en" },
  { url: "https://huggingface.co/blog/feed.xml", name: "HuggingFace Blog", cat: "ai", lang: "en" },
  { url: "https://news.ycombinator.com/rss", name: "Hacker News", cat: "tech-en", lang: "en" }
];

/**
 * Filtra i feed in base a parole chiave nel topic (intelligente)
 */
export function getFeedsByTopic(topic = "all") {
  const t = topic.toLowerCase();
  if (t.includes("linux") || t.includes("ubuntu")) return RSS_FEEDS.filter(f => f.cat === "linux");
  if (t.includes("ai") || t.includes("intelligenza") || t.includes("llama")) return RSS_FEEDS.filter(f => f.cat === "ai");
  if (t.includes("tech") || t.includes("tecnologia")) return RSS_FEEDS.filter(f => f.cat.startsWith("tech"));
  return RSS_FEEDS;
}

/**
 * Esegue il fetch di un singolo feed con User-Agent realistico
 */
export async function fetchFeed(feed, maxItems = 5) {
  try {
    const res = await fetch(feed.url, { 
      signal: AbortSignal.timeout(6000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return [];
    
    const xml = await res.text();
    const itemRe = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    const items = [];
    let m;
    
    while ((m = itemRe.exec(xml)) && items.length < maxItems) {
      const block = m[0];
      const titleMatch = block.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
      const title = titleMatch?.[1].replace(/<[^>]+>/g, "").trim();
      
      let link = block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1];
      if (!link) {
        const hrefMatch = block.match(/href=["']([^"']+)["']/i);
        link = hrefMatch?.[1];
      }

      const date = block.match(/<pubDate>(.*?)<\/pubDate>|<updated>(.*?)<\/updated>|<published>(.*?)<\/published>/i)?.[1];
      
      if (title && link) {
        items.push({ 
          title, 
          url: link, 
          date, 
          sourceName: feed.name || "RSS", 
          cat: feed.cat || "general" 
        });
      }
    }
    return items;
  } catch (error) {
    console.error(`RSS Fetch Error (${feed.url}):`, error.message);
    return [];
  }
}

/**
 * Esegue il fetch parallelo di più feed
 */
export async function fetchFeeds(feeds, maxPerFeed = 5) {
  const results = await Promise.allSettled(feeds.map(f => fetchFeed(f, maxPerFeed)));
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}
