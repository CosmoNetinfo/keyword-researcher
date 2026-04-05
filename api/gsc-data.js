import { google } from 'googleapis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { access_token, startDate, endDate, rowLimit = 150 } = req.body || {};
  if (!access_token) return res.status(401).json({ error: 'Missing access_token' });

  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token });
    const searchconsole = google.searchconsole({ version: 'v1', auth });
    
    // Supporto per query multiple (Trend vs Keywords)
    const type = req.body.type || 'keywords'; // 'keywords' o 'trend'
    
    const requestBody = {
      siteUrl: 'https://www.cosmonet.info/',
      requestBody: {
        startDate: startDate || getDateNDaysAgo(30),
        endDate: endDate || getDateNDaysAgo(3),
        dimensions: type === 'trend' ? ['date'] : (type === 'cannibalization' ? ['query', 'page'] : ['query']),
        rowLimit: type === 'trend' ? 90 : (type === 'cannibalization' ? 1000 : parseInt(rowLimit)),
      },
    };

    const response = await searchconsole.searchanalytics.query(requestBody);
    return res.status(200).json({ rows: response.data.rows || [] });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
