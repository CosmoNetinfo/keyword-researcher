import React from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

const Layout = ({ children, activeView, setView, dueCount }) => {
  console.log("Layout component rendering", { activeView, childrenCount: React.Children.count(children) });
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-inter">
      {/* Sidebar overlay for mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[55] md:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <Sidebar 
        activeView={activeView} 
        setView={(view) => {
          setView(view);
          setIsSidebarOpen(false);
        }} 
        dueCount={dueCount} 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      <div className="flex-1 flex flex-col min-h-screen relative w-full overflow-x-hidden md:ml-[280px]">
        <header className="md:hidden flex items-center justify-between p-4 bg-[#0F172A] text-white sticky top-0 z-[45] w-full border-b border-slate-800">
           <div className="font-bold text-white text-xl tracking-tight">KR Pro</div>
           <button 
             onClick={() => setIsSidebarOpen(true)}
             className="p-2 hover:bg-slate-800 rounded-xl transition-colors"
             aria-label="Apri menu"
           >
             <Menu size={24} className="text-white" />
           </button>
        </header>

        <main className="flex-1 px-4 py-6 md:px-8 md:py-10 max-w-full w-full mx-auto overflow-x-hidden">
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
