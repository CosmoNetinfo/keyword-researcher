import React from 'react';
import { 
  LayoutDashboard, 
  Calendar, 
  History, 
  Search, 
  Settings,
  PlusCircle,
  BarChart3,
  Menu,
  X
} from 'lucide-react';
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const Sidebar = ({ activeView, setView, dueCount }) => {
  const menuItems = [
    { id: 'piano', label: 'Piano Editoriale', icon: Calendar, badge: dueCount },
    { id: 'new', label: 'Nuova Analisi', icon: Search },
    { id: 'history', label: 'Cronologia', icon: History },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] bg-[#0F172A] text-white hidden md:flex flex-col z-50 border-r border-slate-800 shadow-2xl">
      <div className="p-8 pb-12">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3 text-white">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30">
            <LayoutDashboard size={24} />
          </div>
          <span>KR <span className="text-slate-400 font-light italic">Pro</span></span>
        </h1>
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
