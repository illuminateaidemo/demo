/* ============================================================
   Project Intelligence Platform - Sidebar Navigation
   Enterprise sidebar with role-based menu, collapse support,
   and user info / logout section.
   ============================================================ */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { UserRole } from '../../types';

// ─── Nav Item Definition ─────────────────────────────────────

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
  /** If set, only these roles see this item */
  roles?: UserRole[];
  /** Nested sub-items */
  children?: { label: string; path: string }[];
}

// ─── SVG Icons (inline, no external library) ─────────────────

const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z" />
    </svg>
  ),
  clients: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  opportunities: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  projects: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  ),
  resources: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  timesheets: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  expenses: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
    </svg>
  ),
  finance: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approvals: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  logout: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  collapse: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
    </svg>
  ),
  expand: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
    </svg>
  ),
};

// ─── Navigation Configuration ────────────────────────────────

const FINANCE_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.FINANCE, UserRole.PARTNER, UserRole.DIRECTOR];
const MANAGEMENT_ROLES: UserRole[] = [UserRole.ADMIN, UserRole.PARTNER, UserRole.DIRECTOR, UserRole.PROJECT_MANAGER, UserRole.HR];

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: icons.dashboard },
  { label: 'Clients', path: '/clients', icon: icons.clients, roles: MANAGEMENT_ROLES },
  { label: 'Opportunities', path: '/opportunities', icon: icons.opportunities, roles: MANAGEMENT_ROLES },
  { label: 'Projects', path: '/projects', icon: icons.projects },
  { label: 'Resources', path: '/resources', icon: icons.resources, roles: MANAGEMENT_ROLES },
  { label: 'Timesheets', path: '/timesheets', icon: icons.timesheets },
  { label: 'Expenses', path: '/expenses', icon: icons.expenses },
  { label: 'Finance', path: '/finance', icon: icons.finance, roles: FINANCE_ROLES },
  { label: 'Approvals', path: '/approvals', icon: icons.approvals },
];

// ─── Props ───────────────────────────────────────────────────

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

// ─── Component ───────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle, mobileOpen, onMobileClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const userRole = user?.role || UserRole.VIEWER;

  const visibleItems = navItems.filter(
    (item) => !item.roles || item.roles.includes(userRole)
  );

  const isActive = (path: string) => location.pathname.startsWith(path);

  const handleNavClick = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const userInitials = user
    ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase()
    : '??';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* ── Logo / App Name ─── */}
      <div className="flex items-center h-16 px-4 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-bold text-white truncate">Project Intel</div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">Platform</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ─── */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {visibleItems.map((item) => {
          const active = isActive(item.path);
          return (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <button
                onClick={() => handleNavClick(item.path)}
                className={`
                  w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150 cursor-pointer
                  ${active
                    ? 'text-white bg-indigo-600/80'
                    : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }
                  ${collapsed ? 'justify-center' : ''}
                `}
                title={collapsed ? item.label : undefined}
              >
                <span className="flex-shrink-0">{item.icon}</span>
                {!collapsed && <span className="truncate">{item.label}</span>}
              </button>

              {/* Tooltip for collapsed state */}
              {collapsed && hoveredItem === item.path && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 z-50">
                  <div className="bg-slate-800 text-white text-xs font-medium px-3 py-1.5 rounded-md shadow-lg whitespace-nowrap">
                    {item.label}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Collapse Toggle ─── */}
      <div className="px-3 py-2 border-t border-white/10">
        <button
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-150"
        >
          <span className="flex-shrink-0">
            {collapsed ? icons.expand : icons.collapse}
          </span>
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>

      {/* ── User Info & Logout ─── */}
      <div className="px-3 py-3 border-t border-white/10 flex-shrink-0">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white">
              {userInitials}
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Logout"
            >
              {icons.logout}
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-white truncate">
                {user?.full_name || 'User'}
              </div>
              <div className="text-xs text-slate-400 truncate">
                {user?.role?.replace(/_/g, ' ') || 'Viewer'}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0"
              title="Logout"
            >
              {icons.logout}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}

      {/* Mobile sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-[260px] transform transition-transform duration-200 ease-in-out lg:hidden
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={`
          hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:z-30
          sidebar-transition
          ${collapsed ? 'lg:w-[72px]' : 'lg:w-[260px]'}
        `}
      >
        {sidebarContent}
      </aside>
    </>
  );
};

export default Sidebar;
