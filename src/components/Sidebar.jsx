import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  Search, 
  BarChart2,
  Rss,
  X,
  TrendingUp
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Sidebar = ({ activeView, setView, dueCount, isOpen, onClose }) => {
  const menuItems = [
    { id: 'piano',  label: 'Piano Editoriale', icon: Calendar,    badge: dueCount },
    { id: 'new',    label: 'Nuova Analisi',    icon: Search },
    { id: 'trend',  label: 'Trend Monitor',    icon: TrendingUp },
    { id: 'history',label: 'Cronologia',       icon: History },
    { id: 'gsc',    label: 'GSC Insights',     icon: BarChart2 },
  ];

  return (
    <aside className={cn(
      "fixed left-0 top-0 h-screen w-[280px] max-w-full overflow-y-auto bg-[#0F172A] text-white flex flex-col z-[60] border-r border-slate-800 shadow-2xl transition-transform duration-300 md:translate-x-0",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      <div className="p-8 pb-12 flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <LayoutDashboard size={24} />
          </div>
          <span>KR <span className="text-slate-400 font-light italic">Pro</span></span>
        </h1>
        <button 
          onClick={onClose}
          className="md:hidden p-2 hover:bg-slate-800 rounded-lg text-slate-400"
        >
          <X size={24} />
        </button>
      </div>

      <nav className="flex-1 px-4 space-y-1.5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] px-4 mb-4">Principale</p>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-indigo-600 text-white shadow-xl shadow-indigo-600/20" 
                  : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={cn("transition-colors", isActive ? "text-white" : "group-hover:text-white")} />
                <span className="font-semibold text-[14px]">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-[#10B981] text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-4 ring-[#0F172A]">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
        <p className="px-4 pt-5 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Impostazioni</p>
        <button type="button" onClick={() => setView('rss-settings')}
          aria-current={activeView === 'rss-settings' ? 'page' : undefined}
          className={cn(
            "flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold",
            activeView === 'rss-settings' ? "bg-indigo-600 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
          )}>
          <Rss size={20} aria-hidden="true" />
          Fonti RSS
        </button>
      </nav>

      <div className="p-6">
        <div className="bg-slate-800/40 rounded-3xl p-5 border border-slate-700/50">
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.15em] mb-4">Status Sistema</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-[#10B981] animate-ping opacity-75" />
            </div>
            <span className="text-emerald-400 text-xs font-bold font-mono uppercase">Online & Synced</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
