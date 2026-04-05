import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const token = (req.body?.access_token) || (req.headers.authorization?.split(' ')[1]);
  if (!token) return res.status(401).json({ error: 'Missing access_token' });

  const { action, startDate, endDate, rowLimit = 150, type = 'keywords' } = req.body || {};
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const searchconsole = google.searchconsole({ version: 'v1', auth });
  const siteUrl = 'https://www.cosmonet.info/';

  try {
    // ─── 1. KEYWORDS & TRENDS (Ex gsc-data.js) ──────────────────────────────
    if (action === 'data' || !action) {
      const requestBody = {
        siteUrl,
        requestBody: {
          startDate: startDate || getDateNDaysAgo(30),
          endDate: endDate || getDateNDaysAgo(3),
          dimensions: type === 'trend' ? ['date'] : (type === 'cannibalization' ? ['query', 'page'] : ['query']),
          rowLimit: type === 'trend' ? 90 : (type === 'cannibalization' ? 1000 : parseInt(rowLimit)),
        },
      };
      const response = await searchconsole.searchanalytics.query(requestBody);
      return res.status(200).json({ rows: response.data.rows || [] });
    }

    // ─── 2. PAGES ANALYSIS (Ex gsc-pages.js) ───────────────────────────────
    if (action === 'pages') {
      const response = await searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: {
          startDate: startDate || getDateNDaysAgo(28),
          endDate: endDate || getDateNDaysAgo(3),
          dimensions: ['page'],
          rowLimit: parseInt(rowLimit),
        },
      });
      return res.status(200).json({ rows: response.data.rows || [] });
    }

    // ─── 3. GROWTH INTELLIGENCE (Ex growth-intelligence.js) ────────────────
    if (action === 'growth') {
      const now = new Date();
      const startDate7 = getDateNDaysAgo(7);
      const endDate7 = now.toISOString().split('T')[0];
      const startDatePrev = getDateNDaysAgo(14);
      const endDatePrev = getDateNDaysAgo(7);

      const [resCurrent, resPrev] = await Promise.all([
        searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: startDate7, endDate: endDate7, dimensions: ['query', 'page'], rowLimit: 100 } }),
        searchconsole.searchanalytics.query({ siteUrl, requestBody: { startDate: startDatePrev, endDate: endDatePrev, dimensions: ['query', 'page'], rowLimit: 100 } })
      ]);

      const currentRows = resCurrent.data.rows || [];
      const prevRows = resPrev.data.rows || [];

      const growthQuery = currentRows.map(curr => {
        const prev = prevRows.find(p => p.keys[0] === curr.keys[0]);
        const diff = prev ? curr.impressions - prev.impressions : curr.impressions;
        const pct = prev ? (diff / prev.impressions) * 100 : 100;
        return { query: curr.keys[0], page: curr.keys[1], diff, pct, impressions: curr.impressions };
      }).sort((a, b) => b.diff - a.diff).slice(0, 10);

      const sectors = ['linux', 'ai', 'ghidra', 'foss', 'security', 'python'];
      const sectorGrowth = sectors.map(s => {
        const totalGrowth = growthQuery.filter(q => q.query.toLowerCase().includes(s)).reduce((sum, q) => sum + q.diff, 0);
        return { sector: s, growth: totalGrowth };
      }).sort((a, b) => b.growth - a.growth);

      return res.status(200).json({
        success: true,
        topGrowth: growthQuery,
        bestSectorToPush: sectorGrowth[0]?.sector || "General Tech",
        advice: `Spingi i contenuti su "${sectorGrowth[0]?.sector || 'General'}" - Questo cluster ha visto l'incremento di visibilità maggiore nell'ultima settimana.`
      });
    }

    res.status(400).json({ error: 'Azione non valida' });

  } catch (error) {
    console.error("GSC Service Error:", error);
    res.status(500).json({ error: error.message });
  }
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
