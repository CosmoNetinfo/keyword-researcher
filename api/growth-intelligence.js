import { google } from 'googleapis';

export default async function handler(req, res) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: token });
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  try {
    const siteUrl = "https://cosmonet.info/";
    
    // 1. Dati Ultimi 7 Giorni
    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(now.getDate() - 7);
    const startDate7 = sevenDaysAgo.toISOString().split('T')[0];
    const endDate7 = now.toISOString().split('T')[0];

    // 2. Dati Periodo Precedente (7-14 giorni fa) per confronto week-over-week
    const fourteenDaysAgo = new Date(now);
    fourteenDaysAgo.setDate(now.getDate() - 14);
    const startDatePrev = fourteenDaysAgo.toISOString().split('T')[0];
    const endDatePrev = sevenDaysAgo.toISOString().split('T')[0];

    const [resCurrent, resPrev] = await Promise.all([
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: startDate7, endDate: endDate7, dimensions: ['query', 'page'], rowLimit: 100 }
      }),
      searchconsole.searchanalytics.query({
        siteUrl,
        requestBody: { startDate: startDatePrev, endDate: endDatePrev, dimensions: ['query', 'page'], rowLimit: 100 }
      })
    ]);

    const currentRows = resCurrent.data.rows || [];
    const prevRows = resPrev.data.rows || [];

    // Logica di Intelligenza: Calcola quali query/pagine hanno il maggior incremento di impressioni
    const growthQuery = currentRows.map(curr => {
      const prev = prevRows.find(p => p.keys[0] === curr.keys[0]);
      const diff = prev ? curr.impressions - prev.impressions : curr.impressions;
      const pct = prev ? (diff / prev.impressions) * 100 : 100;
      return { query: curr.keys[0], page: curr.keys[1], diff, pct, impressions: curr.impressions };
    }).sort((a, b) => b.diff - a.diff).slice(0, 10);

    // Suggerimento Categoria (Semplificato: basato su parole chiave comuni)
    const sectors = ['linux', 'ai', 'ghidra', 'foss', 'security', 'python'];
    const sectorGrowth = sectors.map(s => {
      const totalGrowth = growthQuery.filter(q => q.query.toLowerCase().includes(s)).reduce((sum, q) => sum + q.diff, 0);
      return { sector: s, growth: totalGrowth };
    }).sort((a, b) => b.growth - a.growth);

    res.status(200).json({
      success: true,
      topGrowth: growthQuery,
      bestSectorToPush: sectorGrowth[0]?.sector || "General Tech",
      advice: `Spingi i contenuti su "${sectorGrowth[0]?.sector || 'General'}" - Questo cluster ha visto l'incremento di visibilità maggiore nell'ultima settimana.`
    });

  } catch (error) {
    console.error("Growth Intel Error:", error);
    res.status(500).json({ error: "Failed to analyze growth" });
  }
}
