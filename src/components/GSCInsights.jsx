import { clearGscSession, GSC_EXPIRED_MESSAGE, isGscExpired, readGscSession } from "../utils/gscSession";
import SeoOpportunities from "./SeoOpportunities";
import { useState, useCallback, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const GSC_CLIENT_ID = import.meta.env.VITE_GSC_CLIENT_ID;
const SCOPES = 'https://www.googleapis.com/auth/webmasters.readonly';

function formatNum(n) {
  if (!n && n !== 0) return '—';
  return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toString();
}
function pos(n) { return (!n && n !== 0) ? '—' : n.toFixed(1); }

export default function GSCInsights({ setView, setPrefilledKeyword, onKeywordsLoaded, onAddToPiano, onSnapshot, onSeoSnapshot, classifications }) {
  const [session, setSession] = useState(readGscSession);
  const accessToken = session.token;
  const [keywords, setKeywords] = useState([]);
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('keywords');
  const [coverage, setCoverage] = useState(null);
  const [trend, setTrend] = useState([]);
  const [analysisType, setAnalysisType] = useState('all');

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

  const expireSession = useCallback(() => {
    clearGscSession(true);
    setSession(readGscSession());
    onSnapshot(null);
    onSeoSnapshot(null);
    onKeywordsLoaded?.([]);
  }, [onSnapshot, onSeoSnapshot, onKeywordsLoaded]);

  useEffect(() => {
    if (!accessToken || !session.expiresAt) return;
    const timer = setTimeout(expireSession, Math.max(0, session.expiresAt - Date.now()));
    return () => clearTimeout(timer);
  }, [accessToken, session.expiresAt, expireSession]);

  const fetchData = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true); setError(null);
    try {
      // Utilizzo del nuovo GSC Service consolidato
      const [kwRes, pgRes, trRes] = await Promise.all([
        fetch('/api/gsc-service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'data', access_token: accessToken, type: 'keywords' }) }),
        fetch('/api/gsc-service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'pages', access_token: accessToken }) }),
        fetch('/api/gsc-service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'data', access_token: accessToken, type: 'trend' }) }),
      ]);
      const kwData = await kwRes.json();
      const pgData = await pgRes.json();
      const trData = await trRes.json();
      
      if (sessionStorage.getItem("gsc_access_token") !== accessToken) return;
      const results = [[kwRes, kwData], [pgRes, pgData], [trRes, trData]];
      if (results.some(([response, data]) => isGscExpired(response, data))) {
        expireSession();
        return;
      }
      const failed = results.find(([response]) => !response.ok);
      if (failed) throw new Error(failed[1].error || "Impossibile leggere Search Console.");
      setCoverage({ current: kwData.current, previous: kwData.previous, keywords: kwData.rowsRead, pages: pgData.rowsRead });
      
      setKeywords(kwData.rows || []);
      setPages(pgData.rows || []);
      setTrend((trData.rows || []).map(r => ({
        date: r.keys[0].split('-').slice(1).reverse().join('/'),
        clicks: r.clicks,
        impressions: r.impressions
      })));
      onKeywordsLoaded?.(kwData.rows || []);
      onSnapshot({
        fetchedAt: new Date().toISOString(), startDate: kwData.current.startDate,
        keywords: (kwData.rows || []).slice(0, 30),
        pages: (pgData.rows || []).slice(0, 30),
      });
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [accessToken, onKeywordsLoaded, onSnapshot, expireSession]);

  useEffect(() => {
    if (accessToken) fetchData();
  }, [accessToken, fetchData]);

  const expires = session.expiresAt ? new Date(session.expiresAt).toLocaleString("it-IT", { timeZone: "Europe/Rome" }) : null;

  if (!accessToken) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-6">
        <div className="text-center max-w-md">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-2xl font-bold mb-2">GSC Insights</h2>
          {session.expired && <p role="alert" className="my-2 text-rose-700">{GSC_EXPIRED_MESSAGE}</p>}
          {session.expired && expires && <p className="mb-2 text-sm">Scadenza del token: {expires} (ora italiana)</p>}
          <p className="text-gray-400 mb-6">Connetti Google Search Console per vedere le keyword reali di cosmonet.info.</p>
          <button onClick={handleLogin} className="flex items-center gap-3 mx-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl transition-all">
            Accedi con Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 bg-slate-950 min-h-screen text-slate-100">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Search Insights</h2>
          <p className="text-slate-500 text-sm mt-1">Analisi dati reali cosmonet.info</p>
        </div>
        <div className="flex items-center gap-4 bg-slate-900/50 p-2 rounded-2xl border border-slate-800">
          <button onClick={fetchData} disabled={loading} className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-6 py-2 rounded-xl transition-all text-sm">
            {loading ? '...' : '⟳ Sync'}
          </button>
          <button onClick={() => { clearGscSession(); setSession(readGscSession()); onSnapshot(null); onSeoSnapshot(null); }} className="text-slate-500 hover:text-rose-400 text-xs font-bold px-4 py-2">Logout</button>
        </div>
      </div>

      {error && <div className="bg-rose-900/20 border border-rose-500/50 text-rose-300 px-6 py-4 rounded-2xl text-sm font-bold">⚠️ {error}</div>}

      {expires && <p className="text-sm text-slate-300">Scadenza del token: {expires} (ora italiana)</p>}
      {coverage && <p className="text-sm text-slate-300">
        Periodo: {coverage.current.startDate} – {coverage.current.endDate} · Precedente: {coverage.previous.startDate} – {coverage.previous.endDate}.
        Righe lette: {coverage.keywords} query e {coverage.pages} pagine. La tabella mostra fino a 150 righe.
      </p>}
      <SeoOpportunities accessToken={accessToken} onAddToPiano={onAddToPiano} onSnapshot={onSeoSnapshot} onSessionExpired={expireSession} classifications={classifications} />

      {keywords.length > 0 && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: 'Keyword', value: keywords.length, color: 'from-blue-500/20 to-indigo-500/20', icon: '🔍' },
              { label: 'Click', value: formatNum(keywords.reduce((s, r) => s + (r.clicks || 0), 0)), color: 'from-emerald-500/20 to-teal-500/20', icon: '⚡' },
              { label: 'Impr.', value: formatNum(keywords.reduce((s, r) => s + (r.impressions || 0), 0)), color: 'from-indigo-500/20 to-purple-500/20', icon: '👁️' },
              { label: 'Posizione', value: pos(keywords.reduce((s, r) => s + (r.position || 0), 0) / keywords.length), color: 'from-amber-500/20 to-orange-500/20', icon: '🏆' },
            ].map(kpi => (
              <div key={kpi.label} className={`bg-gradient-to-br ${kpi.color} border border-white/5 rounded-[2rem] p-6 backdrop-blur-xl relative group`}>
                <div className="absolute top-4 right-6 text-2xl opacity-20 group-hover:scale-125 transition-transform">{kpi.icon}</div>
                <div className="text-xs text-slate-400 font-black uppercase tracking-widest mb-1">{kpi.label}</div>
                <div className="text-3xl font-black text-white">{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="bg-slate-900/40 rounded-[2.5rem] p-8 border border-white/5 h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '16px', color: '#f1f5f9' }} />
                <Area type="monotone" dataKey="clicks" stroke="#818cf8" fillOpacity={1} fill="url(#colorClicks)" strokeWidth={4} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800">
              {[{ id: 'keywords', label: 'Keywords' }, { id: 'pages', label: 'Pages' }].map(t => (
                <button key={t.id} onClick={() => setActiveTab(t.id)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${activeTab === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              {[{ id: 'all', label: 'All' }, { id: 'low_ctr', label: '🎯 Low CTR' }].map(f => (
                <button key={f.id} onClick={() => setAnalysisType(f.id)}
                  className={cn("px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest border transition-all", analysisType === f.id ? "bg-white text-slate-900 border-white" : "text-slate-400 border-slate-800")}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-950/50">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase">Analisi Query / Pagina</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Clicks</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Position</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {(activeTab === 'keywords' ? keywords : pages)
                  .filter(row => {
                    if (activeTab === 'pages' || analysisType === 'all') return true;
                    if (analysisType === 'low_ctr') return row.position < 5 && row.ctr < 0.03;
                    return true;
                  })
                  .map((row, i) => (
                    <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                      <td className="px-8 py-5 font-bold text-slate-100">{row.keys?.[0] || '—'}</td>
                      <td className="px-8 py-5 text-right font-black text-emerald-400">{formatNum(row.clicks)}</td>
                      <td className="px-8 py-5 text-right font-black text-indigo-300">{pos(row.position)}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => { setPrefilledKeyword(row.keys?.[0] || ''); setView('new'); }}
                          className="bg-slate-800 hover:bg-indigo-600 text-slate-300 hover:text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all">
                          Analizza
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
