import { getFeedsByCategory, fetchFeeds } from './rss-feeds.js';


export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const cat = req.query.cat || 'all';
    const limit = parseInt(req.query.limit || '5', 10);

    const feeds = getFeedsByCategory(cat);

    // Per 'all' limitiamo il numero di feed per non andare in timeout (Vercel: 10s)
    const feedsToFetch = cat === 'all' ? feeds.slice(0, 20) : feeds;

    const items = await fetchFeeds(feedsToFetch, Math.min(limit, 8));

    // Header cache: 15 minuti
    res.setHeader('Cache-Control', 's-maxage=900, stale-while-revalidate=60');
    res.status(200).json({
      items: items.slice(0, 120),
      fetchedAt: new Date().toISOString(),
      feedsAttempted: feedsToFetch.length,
    });

  } catch (error) {
    console.error('RSS Trends Error:', error);
    res.status(500).json({ error: error.message });
  }
}
