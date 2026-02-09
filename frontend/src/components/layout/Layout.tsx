/* ============================================================
   Project Intelligence Platform - Main Layout
   Combines Sidebar + Header + scrollable content area.
   Responsive: sidebar collapses on mobile, toggleable on desktop.
   ============================================================ */

import React, { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';

// ─── Props ───────────────────────────────────────────────────

interface LayoutProps {
  children: React.ReactNode;
}

// ─── Component ───────────────────────────────────────────────

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSidebarToggle = useCallback(() => {
    setSidebarCollapsed((prev) => !prev);
  }, []);

  const handleMobileOpen = useCallback(() => {
    setMobileOpen(true);
  }, []);

  const handleMobileClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar */}
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={handleSidebarToggle}
        mobileOpen={mobileOpen}
        onMobileClose={handleMobileClose}
      />

      {/* Main content area - offset by sidebar width on desktop */}
      <div
        className={`
          flex flex-col min-h-screen transition-all duration-200
          ${sidebarCollapsed ? 'lg:ml-[72px]' : 'lg:ml-[260px]'}
        `}
      >
        {/* Header */}
        <Header onMobileMenuToggle={handleMobileOpen} />

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="flex-shrink-0 px-4 lg:px-6 py-3 border-t border-slate-200 bg-white">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Project Intelligence Platform</span>
            <span>v1.0.0</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Layout;
