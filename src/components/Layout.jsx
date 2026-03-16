import React from 'react';
import Sidebar from './Sidebar';

const Layout = ({ children, activeView, setView, dueCount }) => {
  return (
    <div className="flex min-h-screen bg-surface font-roboto">
      {/* Sidebar - Desktop */}
      <Sidebar activeView={activeView} setView={setView} dueCount={dueCount} />
      
      {/* Main Content Area */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-background text-ghost-white sticky top-0 z-40">
           <div className="font-bold text-electric-blue text-xl">KR Pro</div>
           <button className="p-2 hover:bg-slate-500/20 rounded-lg">
             {/* Menu icon for mobile toggle could go here */}
             <div className="w-6 h-0.5 bg-ghost-white mb-1.5" />
             <div className="w-6 h-0.5 bg-ghost-white mb-1.5" />
             <div className="w-6 h-0.5 bg-ghost-white" />
           </button>
        </header>

        {/* Global Action Bar / KPI Overview Placeholder */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
        
        {/* Footer */}
        <footer className="p-6 text-center text-slate-500 text-xs border-t border-slate-500/10">
          © 2026 Keyword Researcher Pro · Design by DesignAI
        </footer>
      </div>
    </div>
  );
};

export default Layout;
