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
        if (ghData.items) {
          githubTrends = ghData.items.map(repo => ({
            type: 'github', title: repo.name, url: repo.html_url, stars: repo.stargazers_count, author: repo.owner.login
          }));
        } else {
          console.error("GitHub API Logic Error or Rate Limit:", ghData);
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
    const res = await fetch(feed.url, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return [];
    const xml = await res.text();
    const itemRe = /<item>([\s\S]*?)<\/item>|<entry>([\s\S]*?)<\/entry>/gi;
    const items = [];
    let m;
    while ((m = itemRe.exec(xml)) && items.length < maxItems) {
      const block = m[0];
      const title = block.match(/<title[^>]*>(.*?)<\/title>/i)?.[1].replace(/<!\[CDATA\[|\]\]>/g, "").replace(/<[^>]+>/g, "");
      const link = block.match(/<link[^>]*>([^<]+)<\/link>/i)?.[1] || block.match(/href=["']([^"']+)["']/i)?.[1];
      const date = block.match(/<pubDate>(.*?)<\/pubDate>|<updated>(.*?)<\/updated>/i)?.[1];
      if (title && link) items.push({ title, url: link, date, sourceName: feed.name, cat: feed.cat });
    }
    return items;
  } catch { return []; }
}
