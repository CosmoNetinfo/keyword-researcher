
// ─── Catalogo Feed RSS ────────────────────────────────────────────────────────
export const RSS_FEEDS = [
  // 🇮🇹 Tech Generale Italiano
  { url: "https://www.hdblog.it/rss/",               name: "HDBlog",              cat: "tech-it", lang: "it" },
  { url: "https://www.tomshw.it/feed/",              name: "Tom's HW Italia",     cat: "tech-it", lang: "it" },
  { url: "https://www.punto-informatico.it/feed/",   name: "Punto Informatico",   cat: "tech-it", lang: "it" },
  { url: "https://www.wired.it/feed/",               name: "Wired Italy",         cat: "tech-it", lang: "it" },
  { url: "https://www.html.it/feed/",                name: "HTML.it",             cat: "tech-it", lang: "it" },
  { url: "https://www.digitalic.it/feed/",           name: "Digitalic",           cat: "tech-it", lang: "it" },
  { url: "https://trovalost.it/feed/",               name: "Trovalost",           cat: "tech-it", lang: "it" },
  { url: "https://www.agendadigitale.eu/feed/",      name: "Agenda Digitale",     cat: "tech-it", lang: "it" },

  // 🇮🇹 Linux & Open Source Italiano
  { url: "https://www.miamammausalinux.org/feed/",   name: "MiaMammaUsaLinux",   cat: "linux",    lang: "it" },
  { url: "https://www.pcpercaso.it/feed/",           name: "PC per Caso",         cat: "linux",    lang: "it" },
  { url: "https://www.linux-magazine.it/feed/",      name: "Linux Magazine IT",   cat: "linux",    lang: "it" },
  { url: "https://openlinux.it/feed/",               name: "OpenLinux",           cat: "linux",    lang: "it" },

  // 🇮🇹 AI & Intelligenza Artificiale Italiano
  { url: "https://www.intelligenzaartificialeitalia.net/?feed=rss2", name: "IA Italia", cat: "ai", lang: "it" },
  { url: "https://www.ai4business.it/feed/",         name: "AI4Business",         cat: "ai",       lang: "it" },
  { url: "https://ninja.it/feed/",                   name: "Ninja Marketing",     cat: "ai",       lang: "it" },

  // 🇮🇹 Gaming Italiano
  { url: "https://www.everyeye.it/rss/",             name: "Everyeye",            cat: "gaming",   lang: "it" },
  { url: "https://multiplayer.it/rss.xml",           name: "Multiplayer.it",      cat: "gaming",   lang: "it" },
  { url: "https://www.spaziogames.it/feed/",         name: "Spaziogames",         cat: "gaming",   lang: "it" },

  // 🌍 Linux & Open Source Internazionale
  { url: "https://itsfoss.com/feed/",                name: "It's FOSS",           cat: "linux",    lang: "en" },
  { url: "https://9to5linux.com/feed/",              name: "9to5Linux",           cat: "linux",    lang: "en" },
  { url: "https://www.omgubuntu.co.uk/feed",         name: "OMG Ubuntu",          cat: "linux",    lang: "en" },
  { url: "https://linuxhint.com/feed/",              name: "Linux Hint",          cat: "linux",    lang: "en" },
  { url: "https://www.phoronix.com/rss.php",         name: "Phoronix",            cat: "linux",    lang: "en" },
  { url: "https://fedoramagazine.org/feed/",         name: "Fedora Magazine",     cat: "linux",    lang: "en" },
  { url: "https://ubuntu.com/blog/feed",             name: "Ubuntu Blog",         cat: "linux",    lang: "en" },
  { url: "https://blog.linuxmint.com/?feed=rss2",    name: "Linux Mint Blog",     cat: "linux",    lang: "en" },
  { url: "https://www.debugpoint.com/feed/",         name: "DebugPoint",          cat: "linux",    lang: "en" },
  { url: "https://news.opensuse.org/feed.xml",       name: "openSUSE News",       cat: "linux",    lang: "en" },
  { url: "https://fossforce.com/feed/",              name: "FOSSforce",           cat: "linux",    lang: "en" },
  { url: "https://www.tecmint.com/feed/",            name: "TecMint",             cat: "linux",    lang: "en" },
  { url: "https://www.2daygeek.com/feed/",           name: "2DayGeek",            cat: "linux",    lang: "en" },

  // 🤖 AI & Machine Learning Internazionale
  { url: "https://venturebeat.com/category/ai/feed/",name: "VentureBeat AI",      cat: "ai",       lang: "en" },
  { url: "https://techcrunch.com/category/artificial-intelligence/feed/", name: "TechCrunch AI", cat: "ai", lang: "en" },
  { url: "https://thenextweb.com/topic/artificial-intelligence/rss", name: "TNW AI", cat: "ai",   lang: "en" },
  { url: "https://www.artificialintelligence-news.com/feed/", name: "AI News",     cat: "ai",       lang: "en" },
  { url: "https://huggingface.co/blog/feed.xml",     name: "HuggingFace Blog",    cat: "ai",       lang: "en" },
  { url: "https://openai.com/news/rss.xml",          name: "OpenAI News",         cat: "ai",       lang: "en" },
  { url: "https://deepmind.google/blog/rss/",        name: "DeepMind Blog",       cat: "ai",       lang: "en" },
  { url: "https://research.google/blog/rss/",        name: "Google Research",     cat: "ai",       lang: "en" },
  { url: "https://blogs.nvidia.com/blog/category/ai/feed/", name: "NVIDIA AI Blog", cat: "ai",    lang: "en" },
  { url: "https://mistral.ai/news/feed/",            name: "Mistral AI",          cat: "ai",       lang: "en" },

  // 💻 Tech Generale Internazionale
  { url: "https://www.howtogeek.com/feed/",          name: "How-To Geek",         cat: "tech-en",  lang: "en" },
  { url: "https://www.makeuseof.com/feed/",          name: "MakeUseOf",           cat: "tech-en",  lang: "en" },
  { url: "https://arstechnica.com/feed/",            name: "Ars Technica",        cat: "tech-en",  lang: "en" },
  { url: "https://www.techradar.com/rss",            name: "TechRadar",           cat: "tech-en",  lang: "en" },
  { url: "https://www.zdnet.com/news/rss.xml",       name: "ZDNet",               cat: "tech-en",  lang: "en" },
  { url: "https://thenewstack.io/feed/",             name: "The New Stack",       cat: "tech-en",  lang: "en" },
  { url: "https://www.bleepingcomputer.com/feed/",   name: "BleepingComputer",    cat: "tech-en",  lang: "en" },
  { url: "https://hackaday.com/feed/",               name: "Hackaday",            cat: "tech-en",  lang: "en" },
  { url: "https://news.ycombinator.com/rss",         name: "Hacker News",         cat: "tech-en",  lang: "en" },
  { url: "https://www.theregister.com/headlines.atom", name: "The Register",      cat: "tech-en",  lang: "en" },
  { url: "https://lwn.net/headlines/newrss",         name: "LWN.net",             cat: "tech-en",  lang: "en" },

  // 🎮 Gaming Linux/PC
  { url: "https://www.gamingonlinux.com/article_rss.php", name: "GamingOnLinux",  cat: "gaming",  lang: "en" },
  { url: "https://boilingsteam.com/feed/",           name: "Boiling Steam",       cat: "gaming",   lang: "en" },

  // 🔧 Self-hosted & Homelab
  { url: "https://noted.lol/rss/",                  name: "Noted.lol",           cat: "selfhosted", lang: "en" },
  { url: "https://www.reddit.com/r/selfhosted/.rss", name: "r/selfhosted",        cat: "selfhosted", lang: "en" },
  { url: "https://www.reddit.com/r/homelab/.rss",    name: "r/homelab",           cat: "selfhosted", lang: "en" },
  { url: "https://www.reddit.com/r/linux/.rss",      name: "r/linux",             cat: "linux",    lang: "en" },
  { url: "https://www.reddit.com/r/artificial/.rss", name: "r/artificial",        cat: "ai",       lang: "en" },
  { url: "https://www.reddit.com/r/MachineLearning/.rss", name: "r/MachineLearning", cat: "ai",   lang: "en" },
  { url: "https://www.reddit.com/r/opensource/.rss", name: "r/opensource",        cat: "linux",    lang: "en" },
];

// ─── Mappa topic → categorie feed rilevanti ───────────────────────────────────
const TOPIC_TO_CATS = {
  "linux":                  ["linux", "tech-en"],
  "open source":            ["linux", "tech-en"],
  "intelligenza artificiale": ["ai", "tech-it"],
  "ai":                     ["ai", "tech-en"],
  "gaming":                 ["gaming", "linux"],
  "wordpress":              ["tech-it", "tech-en"],
};

export function getFeedsByTopic(topic) {
  const t = (topic || "").toLowerCase();
  const match = Object.entries(TOPIC_TO_CATS).find(([key]) => t.includes(key));
  const cats = match ? match[1] : ["tech-it", "tech-en", "ai"];
  return RSS_FEEDS.filter(f => cats.includes(f.cat));
}

export function getFeedsByCategory(cat) {
  if (cat === "all") return RSS_FEEDS;
  return RSS_FEEDS.filter(f => f.cat === cat);
}

// ─── Parser RSS/Atom XML minimale ────────────────────────────────────────────
function extractTag(xml, tag) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = re.exec(xml);
  if (!m) return "";
  return m[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "").trim();
}

function extractAttr(xml, tag, attr) {
  const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, "i");
  const m = re.exec(xml);
  return m ? m[1] : "";
}

function parseItems(xml, maxItems = 5) {
  const items = [];
  // RSS
  const itemRe = /<item>([\s\S]*?)<\/item>/gi;
  let m;
  while ((m = itemRe.exec(xml)) !== null && items.length < maxItems) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link  = extractTag(block, "link") || extractAttr(block, "link", "href");
    const date  = extractTag(block, "pubDate") || extractTag(block, "dc:date") || extractTag(block, "updated");
    if (title && link) items.push({ title, url: link, date });
  }
  if (items.length > 0) return items;
  // Atom
  const entryRe = /<entry>([\s\S]*?)<\/entry>/gi;
  while ((m = entryRe.exec(xml)) !== null && items.length < maxItems) {
    const block = m[1];
    const title = extractTag(block, "title");
    const link  = extractAttr(block, "link", "href");
    const date  = extractTag(block, "updated") || extractTag(block, "published");
    if (title && link) items.push({ title, url: link, date });
  }
  return items;
}

// ─── Fetch singolo feed con timeout ──────────────────────────────────────────
export async function fetchFeed(feed, maxItems = 5, timeoutMs = 4000) {
  const controller = new AbortController();
  const timerId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(feed.url, {
      signal: controller.signal,
      headers: { "User-Agent": "CosmoNetTrendScout/1.0" }
    });
    clearTimeout(timerId);
    if (!res.ok) return [];
    const xml = await res.text();
    const items = parseItems(xml, maxItems);
    return items.map(item => ({
      ...item,
      source:     feed.url,
      sourceName: feed.name,
      cat:        feed.cat,
      lang:       feed.lang,
    }));
  } catch {
    clearTimeout(timerId);
    return [];
  }
}

// ─── Fetch multipli feed in parallelo ────────────────────────────────────────
export async function fetchFeeds(feeds, maxItemsPerFeed = 5) {
  const results = await Promise.allSettled(
    feeds.map(f => fetchFeed(f, maxItemsPerFeed))
  );
  const items = [];
  results.forEach(r => {
    if (r.status === "fulfilled") items.push(...r.value);
  });
  // ordina per data decrescente
  items.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });
  return items;
}
