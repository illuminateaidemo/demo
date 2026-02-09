import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { AuthContext } from '../store/AuthContext';
import KPICard from '../components/common/KPICard';
import Card from '../components/common/Card';

interface DashboardKPIs {
  activeProjects: number;
  utilisationPercent: number;
  pendingApprovals: number;
  revenueMTD: number;
}

interface ProjectHealth {
  onTrack: number;
  atRisk: number;
  critical: number;
  completed: number;
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  user: string;
  timestamp: string;
}

interface Deadline {
  id: string;
  title: string;
  project: string;
  dueDate: string;
  type: string;
}

const DashboardPage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const [kpis, setKpis] = useState<DashboardKPIs>({
    activeProjects: 0,
    utilisationPercent: 0,
    pendingApprovals: 0,
    revenueMTD: 0,
  });
  const [health, setHealth] = useState<ProjectHealth>({
    onTrack: 0,
    atRisk: 0,
    critical: 0,
    completed: 0,
  });
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [kpiRes, healthRes, activityRes, deadlineRes] = await Promise.all([
        api.get('/dashboard/kpis'),
        api.get('/dashboard/project-health'),
        api.get('/dashboard/recent-activity'),
        api.get('/dashboard/deadlines'),
      ]);
      setKpis(kpiRes.data);
      setHealth(healthRes.data);
      setActivities(activityRes.data);
      setDeadlines(deadlineRes.data);
    } catch (err: any) {
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string): string => {
    return new Date(dateStr).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getActivityIcon = (type: string): React.ReactNode => {
    const iconClass = 'w-4 h-4';
    switch (type) {
      case 'project':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
          </svg>
        );
      case 'timesheet':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'expense':
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <p className="text-slate-700 font-medium mb-2">{error}</p>
          <button onClick={fetchDashboard} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const totalProjects = health.onTrack + health.atRisk + health.critical + health.completed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {getGreeting()}, {user?.firstName || 'User'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Here is an overview of your projects and activities
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Active Projects"
          value={kpis.activeProjects}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          }
          color="indigo"
        />
        <KPICard
          title="Utilisation"
          value={`${kpis.utilisationPercent}%`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
          color="emerald"
        />
        <KPICard
          title="Pending Approvals"
          value={kpis.pendingApprovals}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="amber"
        />
        <KPICard
          title="Revenue MTD"
          value={formatCurrency(kpis.revenueMTD)}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="blue"
        />
      </div>

      {/* Project Health */}
      <Card title="Project Health Overview">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-emerald-700">{health.onTrack}</div>
            <div className="text-sm text-emerald-600 mt-1 font-medium">On Track</div>
            {totalProjects > 0 && (
              <div className="text-xs text-emerald-500 mt-0.5">
                {Math.round((health.onTrack / totalProjects) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-amber-700">{health.atRisk}</div>
            <div className="text-sm text-amber-600 mt-1 font-medium">At Risk</div>
            {totalProjects > 0 && (
              <div className="text-xs text-amber-500 mt-0.5">
                {Math.round((health.atRisk / totalProjects) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-red-700">{health.critical}</div>
            <div className="text-sm text-red-600 mt-1 font-medium">Critical</div>
            {totalProjects > 0 && (
              <div className="text-xs text-red-500 mt-0.5">
                {Math.round((health.critical / totalProjects) * 100)}%
              </div>
            )}
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-slate-700">{health.completed}</div>
            <div className="text-sm text-slate-600 mt-1 font-medium">Completed</div>
            {totalProjects > 0 && (
              <div className="text-xs text-slate-500 mt-0.5">
                {Math.round((health.completed / totalProjects) * 100)}%
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Two-column layout: Activities and Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <Card title="Recent Activity">
          <div className="space-y-1">
            {activities.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No recent activity</p>
            ) : (
              activities.slice(0, 8).map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0"
                >
                  <div className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-700">{activity.description}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {activity.user} &middot; {formatDate(activity.timestamp)} at {formatTime(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Upcoming Deadlines */}
        <Card title="My Upcoming Deadlines">
          <div className="space-y-1">
            {deadlines.length === 0 ? (
              <p className="text-slate-400 text-sm py-4 text-center">No upcoming deadlines</p>
            ) : (
              deadlines.slice(0, 8).map((deadline) => {
                const dueDate = new Date(deadline.dueDate);
                const now = new Date();
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = diffDays < 0;
                const isUrgent = diffDays >= 0 && diffDays <= 2;

                return (
                  <div
                    key={deadline.id}
                    className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0"
                  >
                    <div
                      className={`flex-shrink-0 w-2 h-2 rounded-full ${
                        isOverdue ? 'bg-red-500' : isUrgent ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 font-medium truncate">{deadline.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{deadline.project}</p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p
                        className={`text-xs font-medium ${
                          isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-slate-500'
                        }`}
                      >
                        {formatDate(deadline.dueDate)}
                      </p>
                      {isOverdue && (
                        <p className="text-xs text-red-500 mt-0.5">Overdue</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => navigate('/timesheets')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:bg-indigo-50 hover:border-indigo-200 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center group-hover:bg-indigo-200 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-700">Submit Timesheet</span>
          </button>
          <button
            onClick={() => navigate('/expenses')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:bg-emerald-50 hover:border-emerald-200 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-200 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-700">Log Expense</span>
          </button>
          <button
            onClick={() => navigate('/approvals')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:bg-amber-50 hover:border-amber-200 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-200 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-700">Review Approvals</span>
          </button>
          <button
            onClick={() => navigate('/projects')}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-white hover:bg-blue-50 hover:border-blue-200 transition group"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center group-hover:bg-blue-200 transition">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <span className="text-sm font-medium text-slate-700">View Projects</span>
          </button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
