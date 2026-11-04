/* global process */
import { fetchFeed, fetchFeeds } from './rss-feeds.js';

import { fetchPublicRss } from './public-rss.js';
import { normalizeFeedUrl, RSS_BATCH_SIZE } from '../src/utils/feedUrl.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

export default async function handler(req, res) {
  const { action } = req.query;

  try {
    // ─── 0. COMPETITOR SCANNER (NEW) ──────────────────────────────────────
    if (action === "scan-competitor") {
      const domain = req.body?.domain || req.query?.domain;
      if (!domain) {
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
          githubTrends = [
            { type: 'github', title: 'torvalds/linux', url: 'https://github.com/torvalds/linux', stars: 171000, author: 'torvalds' },
            { type: 'github', title: 'freeCodeCamp/freeCodeCamp', url: 'https://github.com/freeCodeCamp/freeCodeCamp', stars: 380000, author: 'freeCodeCamp' },
            { type: 'github', title: 'microsoft/vscode', url: 'https://github.com/microsoft/vscode', stars: 155000, author: 'microsoft' }
          ];
        }
      } catch (e) { console.error(e); }

      const hfUrl = 'https://huggingface.co/api/models?sort=downloads&direction=-1&limit=5';
      const hfRes = await fetch(hfUrl, { headers: { "User-Agent": "CosmoNet-App" } });
      const hfData = await hfRes.json();
      const hfTrends = (hfData || []).slice(0, 5).map(model => ({
        type: 'huggingface', title: model.modelId || model.id || "Unknown Model", 
        url: `https://huggingface.co/${model.modelId || model.id}`, downloads: model.downloads || 0
      }));

      return res.status(200).json({ success: true, trends: [...githubTrends, ...hfTrends] });
    }

    // ─── 2. RSS FEED SCANNER ───────────────────────────────────────────────
    const submitted = req.body?.feeds;
    if (submitted !== undefined && (!Array.isArray(submitted) || submitted.length > RSS_BATCH_SIZE)) {
      return res.status(400).json({ error: "Invalid RSS feed list" });
    }

    const feeds = new Map();
    for (const feed of submitted || []) {
      const url = typeof feed?.url === 'string' && normalizeFeedUrl(feed.url);
      if (!url || feeds.has(url)) continue;
      const name = typeof feed.name === 'string' ? feed.name.trim().slice(0, 200) : '';
      feeds.set(url, { url, name: name || new URL(url).hostname });
    }

    const items = await fetchFeeds([...feeds.values()], 5, fetchPublicRss);
    return res.status(200).json({ items });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
