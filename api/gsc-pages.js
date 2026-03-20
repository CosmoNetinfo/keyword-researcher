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
    const response = await searchconsole.searchanalytics.query({
      siteUrl: 'https://www.cosmonet.info/',
      requestBody: {
        startDate: startDate || getDateNDaysAgo(28),
        endDate: endDate || getDateNDaysAgo(3),
        dimensions: ['page'],
        rowLimit: parseInt(rowLimit),
      },
    });
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
