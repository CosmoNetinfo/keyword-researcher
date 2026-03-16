import React from 'react';
import { TrendingUp, Users, FileText, CheckCircle2 } from 'lucide-react';

const KPICard = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-500/10 hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl bg-${color}/10 text-${color}`}>
        <Icon size={24} />
      </div>
      {trend && (
        <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
          <TrendingUp size={12} />
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1 font-inter">{title}</h3>
    <p className="text-2xl font-bold font-inter text-deep-space">{value}</p>
  </div>
);

const KPIOverview = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <KPICard 
        title="Articoli in Piano" 
        value={stats.total || 0} 
        icon={FileText} 
        color="electric-blue" 
      />
      <KPICard 
        title="Da Scrivere" 
        value={stats.todo || 0} 
        icon={TrendingUp} 
        color="amber-500" 
      />
      <KPICard 
        title="Pubblicati" 
        value={stats.done || 0} 
        icon={CheckCircle2} 
        color="emerald-500" 
      />
      <KPICard 
        title="Nuovi Analisi" 
        value={stats.analyses || 0} 
        icon={Users} 
        color="electric-blue" 
      />
    </div>
  );
};

export default KPIOverview;
