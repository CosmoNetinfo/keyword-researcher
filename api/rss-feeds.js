// Catalogo feed CosmoNet: 42 fonti verificate il 3 novembre 2026.
// Wired e IA Italia mantenute dal catalogo originale; verifica non riuscita.
export const RSS_FEEDS = [
  // tech-it
  {"url": "https://www.hdblog.it/rss/", "name": "HDBlog", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.tomshw.it/feed/", "name": "Tom's HW Italia", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.punto-informatico.it/feed/", "name": "Punto Informatico", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.html.it/feed/", "name": "HTML.it", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.ilsoftware.it/feed/", "name": "IlSoftware", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.navigaweb.net/feeds/posts/default", "name": "Navigaweb", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.smartworld.it/feed/", "name": "SmartWorld", "cat": "tech-it", "lang": "it"},
  {"url": "https://www.wired.it/feed/", "name": "Wired Italy", "cat": "tech-it", "lang": "it"},
  // linux
  {"url": "https://www.miamammausalinux.org/feed/", "name": "MiaMammaUsaLinux", "cat": "linux", "lang": "it"},
  {"url": "https://feed.itsfoss.com/", "name": "It's FOSS", "cat": "linux", "lang": "en"},
  {"url": "https://9to5linux.com/feed/", "name": "9to5Linux", "cat": "linux", "lang": "en"},
  {"url": "https://www.omgubuntu.co.uk/feed", "name": "OMG! Ubuntu", "cat": "linux", "lang": "en"},
  {"url": "https://www.phoronix.com/rss.php", "name": "Phoronix", "cat": "linux", "lang": "en"},
  {"url": "https://linuxiac.com/feed/", "name": "Linuxiac", "cat": "linux", "lang": "en"},
  {"url": "https://www.linuxtoday.com/feed/", "name": "Linux Today", "cat": "linux", "lang": "en"},
  {"url": "https://blog.linuxmint.com/?feed=rss2", "name": "Linux Mint Blog", "cat": "linux", "lang": "en"},
  {"url": "https://blogs.kde.org/index.xml", "name": "KDE Blogs", "cat": "linux", "lang": "en"},
  {"url": "https://ubuntu.com/blog/feed", "name": "Ubuntu Blog", "cat": "linux", "lang": "en"},
  {"url": "https://fedoramagazine.org/feed/", "name": "Fedora Magazine", "cat": "linux", "lang": "en"},
  // ai
  {"url": "https://huggingface.co/blog/feed.xml", "name": "Hugging Face Blog", "cat": "ai", "lang": "en"},
  {"url": "https://openai.com/news/rss.xml", "name": "OpenAI News", "cat": "ai", "lang": "en"},
  {"url": "https://deepmind.google/blog/rss.xml", "name": "Google DeepMind", "cat": "ai", "lang": "en"},
  {"url": "https://blog.google/technology/ai/rss/", "name": "Google AI Blog", "cat": "ai", "lang": "en"},
  {"url": "https://www.microsoft.com/en-us/research/feed/", "name": "Microsoft Research", "cat": "ai", "lang": "en"},
  {"url": "https://blogs.nvidia.com/feed/", "name": "NVIDIA Blog", "cat": "ai", "lang": "en"},
  {"url": "https://simonwillison.net/atom/everything/", "name": "Simon Willison", "cat": "ai", "lang": "en"},
  {"url": "https://www.marktechpost.com/feed/", "name": "MarkTechPost", "cat": "ai", "lang": "en"},
  {"url": "https://www.intelligenzaartificialeitalia.net/?feed=rss2", "name": "IA Italia", "cat": "ai", "lang": "it"},
  // gaming
  {"url": "https://www.gamingonlinux.com/article_rss.php", "name": "GamingOnLinux", "cat": "gaming", "lang": "en"},
  {"url": "https://steamdeckhq.com/feed/", "name": "Steam Deck HQ", "cat": "gaming", "lang": "en"},
  // selfhosted
  {"url": "https://www.docker.com/blog/feed/", "name": "Docker Blog", "cat": "selfhosted", "lang": "en"},
  {"url": "https://blog.n8n.io/rss/", "name": "n8n Blog", "cat": "selfhosted", "lang": "en"},
  {"url": "https://www.home-assistant.io/atom.xml", "name": "Home Assistant", "cat": "selfhosted", "lang": "en"},
  {"url": "https://selfh.st/rss/", "name": "selfh.st", "cat": "selfhosted", "lang": "en"},
  {"url": "https://jellyfin.org/posts/rss.xml", "name": "Jellyfin", "cat": "selfhosted", "lang": "en"},
  // tech-en
  {"url": "https://news.ycombinator.com/rss", "name": "Hacker News", "cat": "tech-en", "lang": "en"},
  {"url": "https://github.blog/feed/", "name": "GitHub Blog", "cat": "tech-en", "lang": "en"},
  {"url": "https://www.bleepingcomputer.com/feed/", "name": "BleepingComputer", "cat": "tech-en", "lang": "en"},
  {"url": "https://feeds.feedburner.com/TheHackersNews", "name": "The Hacker News", "cat": "tech-en", "lang": "en"},
  {"url": "https://krebsonsecurity.com/feed/", "name": "Krebs on Security", "cat": "tech-en", "lang": "en"},
  {"url": "https://www.windowslatest.com/feed/", "name": "Windows Latest", "cat": "tech-en", "lang": "en"},
  {"url": "https://github.com/microsoft/PowerToys/releases.atom", "name": "Microsoft PowerToys Releases", "cat": "tech-en", "lang": "en"},
  {"url": "https://github.com/ollama/ollama/releases.atom", "name": "Ollama Releases", "cat": "tech-en", "lang": "en"},
  {"url": "https://github.com/Comfy-Org/ComfyUI/releases.atom", "name": "ComfyUI Releases", "cat": "tech-en", "lang": "en"},
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
    const itemRe = /<item\b[^>]*>([\s\S]*?)<\/item>|<entry\b[^>]*>([\s\S]*?)<\/entry>/gi;
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

      const dateMatch = block.match(/<pubDate>(.*?)<\/pubDate>|<updated>(.*?)<\/updated>|<published>(.*?)<\/published>/i);
      const date = dateMatch?.[1] || dateMatch?.[2] || dateMatch?.[3];
      
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
