import { TREND_WINDOWS } from "../utils/trendPreferences";

export default function TrendSettings({ hours, onChange, onBack }) {
  return (
    <section className="mx-auto max-w-3xl space-y-5">
      <div>
        <p className="text-sm font-semibold text-indigo-700">Impostazioni</p>
        <h2 className="text-2xl font-extrabold text-slate-900">Preferenze Trend Monitor</h2>
      </div>
      <fieldset className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
        <legend className="px-1 font-semibold text-slate-900">Periodo delle notizie</legend>
        {TREND_WINDOWS.map(window => (
          <label key={window} className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-800">
            <input type="radio" name="trend-hours" checked={hours === window}
              onChange={() => onChange(window)} className="h-4 w-4 accent-indigo-600" />
            Ultime {window} ore
          </label>
        ))}
        <p className="text-sm text-slate-600">La scelta viene salvata in questo browser.</p>
      </fieldset>
      <button type="button" onClick={onBack}
        className="min-h-11 rounded-xl bg-indigo-600 px-4 text-sm font-bold text-white">
        Torna al Trend Monitor
      </button>
    </section>
  );
}
