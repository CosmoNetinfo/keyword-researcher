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

const Sidebar = ({ activeView, setView, dueCount }) => {
  const menuItems = [
    { id: 'piano', label: 'Piano Editoriale', icon: Calendar, badge: dueCount },
    { id: 'new', label: 'Nuova Analisi', icon: Search },
    { id: 'history', label: 'Cronologia', icon: History },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-slate-500/20 text-ghost-white hidden md:flex flex-col z-50">
      <div className="p-6">
        <h1 className="text-2xl font-bold font-inter text-electric-blue flex items-center gap-2">
          <LayoutDashboard size={28} />
          <span>KR <span className="text-ghost-white font-light">Pro</span></span>
        </h1>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group ${
                isActive 
                  ? 'bg-electric-blue text-white shadow-lg shadow-electric-blue/20' 
                  : 'text-slate-500 hover:bg-slate-500/10 hover:text-ghost-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={20} className={isActive ? 'text-white' : 'group-hover:text-ghost-white'} />
                <span className="font-semibold">{item.label}</span>
              </div>
              {item.badge > 0 && (
                <span className="bg-amber-500 text-deep-space text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="p-4 border-t border-slate-500/10 mb-6">
        <div className="bg-slate-500/5 rounded-2xl p-4">
          <p className="text-xs text-slate-500 font-medium mb-2 uppercase tracking-wider text-center">System Status</p>
          <div className="flex items-center justify-center gap-2 text-emerald-500 text-sm font-bold">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online & Synced</span>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
