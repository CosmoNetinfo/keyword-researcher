import { useState, useCallback } from 'react';

const GSC_CLIENT_ID = import.meta.env.VITE_GSC_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly';

function getDateNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}
function formatNum(n) {
  if (!n && n !== 0) return '—';
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
}
function pct(n) { return (!n && n !== 0) ? '—' : (n * 100).toFixed(1) + '%'; }
function pos(n) { return (!n && n !== 0) ? '—' : n.toFixed(1); }

export default function GSCInsights() {
  const [accessToken, setAccessToken] = useState(() => {
    if (typeof window !== 'undefined' && window.location.hash.includes('access_token')) {
      const params = new URLSearchParams(window.location.hash.replace('#', ''));
      const token = params.get('access_token');
      if (token) { window.history.replaceState(null, '', window.location.pathname); return token; }
    }
    return null;
  });
  const [keywords, setKeywords] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('keywords');
  const [dateRange, setDateRange] = useState('28');

  const handleLogin = useCallback(() => {
    const params = new URLSearchParams({
      client_id: GSC_CLIENT_ID,
      redirect_uri: window.location.origin,
      response_type: 'token',
      scope: SCOPES,
      prompt: 'consent',
    });
    window.location.href = `https://accounts.google.com/o/oauth2/auth?${params}`;
  }, []);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try {
      const startDate = getDateNDaysAgo(parseInt(dateRange));
      const [kwRes, pgRes] = await Promise.all([
        fetch('/api/gsc-data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: accessToken, rowLimit: 150, startDate }) }),
        fetch('/api/gsc-pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: accessToken, rowLimit: 150, startDate }) }),
      ]);
      const kwData = await kwRes.json();
      const pgData = await pgRes.json();
      if (kwData.error) throw new Error(kwData.error);
      setKeywords(kwData.rows || []);
      setPages(pgData.rows || []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accessToken, dateRange]);

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">GSC Insights</h2>
          <p className="text-gray-400 mb-6">Connetti Google Search Console per vedere le keyword reali di cosmonet.info con click, impressioni, CTR e posizione media.</p>
          <button onClick={handleLogin} className="flex items-center gap-3 mx-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all">
            <svg width="20" height="20" viewBox="0 0 48 48">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            </svg>
            Accedi con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-2xl font-bold">GSC Insights — cosmonet.info</h2>
        <div className="flex items-center gap-3">
          <select value={dateRange} onChange={e => setDateRange(e.target.value)} className="bg-gray-800 text-white border border-gray-700 rounded-lg px-3 py-2 text-sm">
            <option value="7">Ultimi 7 giorni</option>
            <option value="28">Ultimi 28 giorni</option>
            <option value="90">Ultimi 90 giorni</option>
          </select>
          <button onClick={fetchData} disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-xl transition-all text-sm">
            {loading ? 'Caricamento...' : '⟳ Aggiorna'}
          </button>
          <button onClick={() => setAccessToken(null)} className="text-gray-500 hover:text-gray-300 text-sm px-3 py-2">Disconnetti</button>
        </div>
      </div>

      {error && <div className="bg-red-900/40 border border-red-700 text-red-300 px-4 py-3 rounded-xl">⚠️ {error}</div>}

      {keywords.length === 0 && !loading && (
        <div className="text-center text-gray-500 py-16">
          <div className="text-4xl mb-3">🔍</div>
          Clicca "Aggiorna" per caricare i dati da Google Search Console
        </div>
      )}

      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Keyword tracciate', value: keywords.length, color: 'text-purple-400' },
              { label: 'Click totali', value: formatNum(keywords.reduce((s, r) => s + (r.clicks || 0), 0)), color: 'text-green-400' },
              { label: 'Impressioni', value: formatNum(keywords.reduce((s, r) => s + (r.impressions || 0), 0)), color: 'text-blue-400' },
              { label: 'Pos. media', value: pos(keywords.reduce((s, r) => s + (r.position || 0), 0) / keywords.length), color: 'text-yellow-400' },
            ].map(kpi => (
              <div key={kpi.label} className="bg-gray-800 rounded-xl p-4 text-center">
                <div className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</div>
                <div className="text-xs text-gray-400 mt-1">{kpi.label}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            {[{ id: 'keywords', label: '🔍 Keyword' }, { id: 'pages', label: '📄 Pagine' }].map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === t.id ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="bg-gray-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">{activeTab === 'keywords' ? 'Keyword' : 'Pagina'}</th>
                    <th className="text-right px-4 py-3">Click</th>
                    <th className="text-right px-4 py-3">Impressioni</th>
                    <th className="text-right px-4 py-3">CTR</th>
                    <th className="text-right px-4 py-3">Posizione</th>
                  </tr>
                </thead>
                <tbody>
                  {(activeTab === 'keywords' ? keywords : pages).map((row, i) => (
                    <tr key={i} className="border-b border-gray-700/50 hover:bg-gray-700/30 transition-all">
                      <td className="px-4 py-3 font-medium max-w-xs truncate" title={row.keys?.[0]}>{row.keys?.[0] || '—'}</td>
                      <td className="px-4 py-3 text-right text-green-400 font-semibold">{formatNum(row.clicks)}</td>
                      <td className="px-4 py-3 text-right text-blue-400">{formatNum(row.impressions)}</td>
                      <td className="px-4 py-3 text-right text-yellow-400">{pct(row.ctr)}</td>
                      <td className="px-4 py-3 text-right text-gray-300">{pos(row.position)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
