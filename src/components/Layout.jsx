import React from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children, activeView, setView, dueCount }) => {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-inter">
      <Sidebar activeView={activeView} setView={setView} dueCount={dueCount} />
      
      <div className="flex-1 md:ml-[280px] flex flex-col min-h-screen relative">
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white sticky top-0 z-40">
           <div className="font-bold text-white text-xl">KR Pro</div>
           <button className="p-2 hover:bg-slate-700 rounded-lg">
             <Menu size={24} />
           </button>
        </header>

        <main className="flex-1 px-8 py-10 max-w-[1400px] w-full mx-auto">
          {children}
        </main>
        
        <footer className="p-8 text-center text-slate-400 text-[11px] font-medium border-t border-slate-200">
          © 2026 Keyword Researcher Pro · Design by DesignAI · Real-time Sync Active
        </footer>
      </div>
    </div>
  );
};

export default Layout;
