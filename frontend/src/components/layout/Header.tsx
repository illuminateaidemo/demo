/* ============================================================
   Project Intelligence Platform - Header Bar
   Top header with page title, search, notifications, user menu.
   ============================================================ */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { useApi } from '../../hooks/useApi';
import { approvals } from '../../services/api';
import type { ApprovalSummary } from '../../types';

// ─── Route → Title mapping ──────────────────────────────────

const ROUTE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/clients': 'Clients',
  '/opportunities': 'Opportunities',
  '/projects': 'Projects',
  '/resources': 'Resources',
  '/timesheets': 'Timesheets',
  '/expenses': 'Expenses',
  '/finance': 'Finance',
  '/approvals': 'Approvals',
  '/settings': 'Settings',
};

function getPageTitle(pathname: string): string {
  // Exact match first
  if (ROUTE_TITLES[pathname]) return ROUTE_TITLES[pathname];

  // Prefix match (e.g., /projects/123 → Projects)
  for (const [route, title] of Object.entries(ROUTE_TITLES)) {
    if (pathname.startsWith(route)) return title;
  }

  return 'Project Intelligence';
}

// ─── Props ───────────────────────────────────────────────────

interface HeaderProps {
  onMobileMenuToggle: () => void;
}

// ─── Component ───────────────────────────────────────────────

const Header: React.FC<HeaderProps> = ({ onMobileMenuToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Fetch pending approval count
  const { data: approvalSummary, execute: fetchApprovals } = useApi<ApprovalSummary, []>(
    approvals.summary
  );

  useEffect(() => {
    fetchApprovals();
    // Re-fetch every 60 seconds
    const interval = setInterval(() => {
      fetchApprovals();
    }, 60000);
    return () => clearInterval(interval);
  }, [fetchApprovals]);

  const pendingCount = approvalSummary?.pending_count ?? 0;

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const pageTitle = useMemo(() => getPageTitle(location.pathname), [location.pathname]);

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '??';

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleLogout = () => {
    setUserMenuOpen(false);
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-20 h-16 bg-white border-b border-slate-200 flex items-center px-4 lg:px-6 gap-4">
      {/* Mobile menu button */}
      <button
        className="lg:hidden p-2 -ml-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        onClick={onMobileMenuToggle}
        aria-label="Open sidebar"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Page title */}
      <h1 className="text-lg font-semibold text-slate-900 whitespace-nowrap">
        {pageTitle}
      </h1>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search bar */}
      <form
        onSubmit={handleSearchSubmit}
        className={`
          hidden md:flex items-center max-w-md w-full
          rounded-lg border bg-slate-50 transition-all duration-200
          ${searchFocused ? 'border-indigo-400 ring-2 ring-indigo-100 bg-white' : 'border-slate-200'}
        `}
      >
        <svg
          className="w-4 h-4 text-slate-400 ml-3 flex-shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setSearchFocused(true)}
          onBlur={() => setSearchFocused(false)}
          placeholder="Search projects, clients, resources..."
          className="flex-1 bg-transparent border-none px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-0"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="p-1.5 mr-1 rounded text-slate-400 hover:text-slate-600"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* Spacer */}
      <div className="flex-1 hidden md:block" />

      {/* Notification bell */}
      <button
        onClick={() => navigate('/approvals')}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        aria-label="Pending approvals"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {pendingCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold">
            {pendingCount > 99 ? '99+' : pendingCount}
          </span>
        )}
      </button>

      {/* User avatar / dropdown */}
      <div className="relative" ref={userMenuRef}>
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
            {userInitials}
          </div>
          <div className="hidden lg:block text-left">
            <div className="text-sm font-medium text-slate-700 leading-tight">
              {user?.full_name || 'User'}
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              {user?.role?.replace(/_/g, ' ') || ''}
            </div>
          </div>
          <svg className="w-4 h-4 text-slate-400 hidden lg:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown menu */}
        {userMenuOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50 animate-scale-in">
            <div className="px-4 py-3 border-b border-slate-100">
              <div className="text-sm font-medium text-slate-900">{user?.full_name}</div>
              <div className="text-xs text-slate-500 truncate">{user?.email}</div>
            </div>

            <button
              onClick={() => { setUserMenuOpen(false); navigate('/dashboard'); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
              </svg>
              My Dashboard
            </button>

            <button
              onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Settings
            </button>

            <div className="border-t border-slate-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
