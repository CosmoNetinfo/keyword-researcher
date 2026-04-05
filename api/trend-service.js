/* global process */
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// ─── Catalogo Feed RSS ────────────────────────────────────────────────────────
const RSS_FEEDS = [
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

export default async function handler(req, res) {
  const { action, cat = 'all', limit = 5 } = req.query;

  try {
    // ─── 0. COMPETITOR SCANNER (NEW) ──────────────────────────────────────
    if (action === "scan-competitor") {
      const domain = req.body?.domain || req.query?.domain;
      if (!domain) {
        console.error("Scan Competitor Error: Missing domain in", req.body, req.query);
        return res.status(400).json({ error: "Missing domain" });
      }

      const cleanDomain = domain.replace(/^(https?:\/\/)?(www\.)?/, "").split('/')[0];
      const base = `https://${cleanDomain}`;
      
      const potentialFeeds = [
        { url: `${base}/feed/` },
        { url: `${base}/rss/` },
        { url: `${base}/rss.xml` },
        { url: `${base}/feed.xml` },
        { url: `${base}/index.xml` },
        { url: `${base}/atom.xml` },
        { url: `${base}/blog/feed/` },
        { url: `${base}/?feed=rss2` }
      ];

      for (const feed of potentialFeeds) {
        const items = await fetchFeed(feed, 5);
        if (items && items.length > 0) {
          return res.status(200).json({ success: true, items, feedUrl: feed.url });
        }
      }
      return res.status(404).json({ error: "No public feed found. This site might block scanners or use a custom path." });
    }

    // ─── 1. RADAR TRENDS (GitHub & Hugging Face) ────────────────────────────
    if (action === 'radar') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const dateFormatted = thirtyDaysAgo.toISOString().split('T')[0];
      const ghQuery = `created:>${dateFormatted} topic:ai OR topic:linux OR topic:open-source`;
      const ghUrl = `https://api.github.com/search/repositories?q=${encodeURIComponent(ghQuery)}&sort=stars&order=desc&per_page=10`;
      
      let githubTrends = [];
      try {
        const ghRes = await fetch(ghUrl, { 
          headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : { "User-Agent": "CosmoNet-App" } 
        });
        const ghData = await ghRes.json();
        
        if (ghData.items && ghData.items.length > 0) {
          githubTrends = ghData.items.map(repo => ({
            type: 'github', title: repo.name, url: repo.html_url, stars: repo.stargazers_count, author: repo.owner.login
          }));
        } else {
          // --- GitHub FAIL-SAFE SPECIFICO ---
          githubTrends = [
            { type: 'github', title: 'torvalds/linux', url: 'https://github.com/torvalds/linux', stars: 171000, author: 'torvalds' },
            { type: 'github', title: 'freeCodeCamp/freeCodeCamp', url: 'https://github.com/freeCodeCamp/freeCodeCamp', stars: 380000, author: 'freeCodeCamp' },
            { type: 'github', title: 'microsoft/vscode', url: 'https://github.com/microsoft/vscode', stars: 155000, author: 'microsoft' }
          ];
          console.warn("GitHub results empty or error, using backup repos.");
        }
      } catch (e) {
        console.error("GitHub Fetch Error:", e);
      }

      const hfUrl = 'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=5';
      const hfRes = await fetch(hfUrl, { headers: { "User-Agent": "CosmoNet-App" } });
      const hfData = await hfRes.json();
      const hfTrends = (hfData || []).slice(0, 5).map(model => ({
        type: 'huggingface', 
        title: model.modelId || model.id || "Unknown Model", 
        url: `https://huggingface.co/${model.modelId || model.id}`, 
        downloads: model.downloads || 0
      }));

      // --- FAIL-SAFE DATA (Se tutto il resto fallisce) ---
      let finalTrends = [...githubTrends, ...hfTrends];
      if (finalTrends.length === 0) {
        finalTrends = [
          { type: 'github', title: 'torvalds/linux', url: 'https://github.com/torvalds/linux', stars: 170000, author: 'torvalds' },
          { type: 'huggingface', title: 'meta-llama/Meta-Llama-3-8B', url: 'https://huggingface.co/meta-llama/Meta-Llama-3-8B', downloads: 1200000 }
        ];
      }

      return res.status(200).json({ success: true, trends: finalTrends });
    }

    // ─── 2. RSS FEED SCANNER ───────────────────────────────────────────────
    const feedsToFetch = cat === 'all' ? RSS_FEEDS.slice(0, 15) : RSS_FEEDS.filter(f => f.cat === cat);
    const results = await Promise.allSettled(feedsToFetch.map(f => fetchFeed(f, Math.min(limit, 8))));
    const items = results.filter(r => r.status === 'fulfilled').flatMap(r => r.value)
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    res.status(200).json({ items: items.slice(0, 100), fetchedAt: new Date().toISOString() });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function fetchFeed(feed, maxItems) {
  try {
    const res = await fetch(feed.url, { 
      signal: AbortSignal.timeout(4000),
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
          cat: feed.cat || "competitor" 
        });
      }
    }
    return items;
  } catch { return []; }
}
