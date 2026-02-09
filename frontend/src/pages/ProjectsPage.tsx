import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/common/KPICard';
import StatusBadge from '../components/common/StatusBadge';

interface Project {
  id: string;
  code: string;
  name: string;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
  status: 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
  healthStatus: 'green' | 'amber' | 'red' | 'none';
  practice: string;
  budget: number;
  startDate: string;
  endDate: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const HEALTH_OPTIONS = [
  { value: 'green', label: 'On Track' },
  { value: 'amber', label: 'At Risk' },
  { value: 'red', label: 'Critical' },
];

const PRACTICE_OPTIONS = [
  'Strategy',
  'Technology',
  'Operations',
  'Finance',
  'Risk',
  'People',
  'Digital',
];

const ProjectsPage: React.FC = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [managers, setManagers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [practiceFilter, setPracticeFilter] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [managerFilter, setManagerFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectRes, clientRes, userRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients'),
        api.get('/users'),
      ]);
      setProjects(projectRes.data.items || projectRes.data);
      setClients((clientRes.data.items || clientRes.data).map((c: any) => ({ id: c.id, name: c.name })));
      setManagers((userRes.data.items || userRes.data).map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })));
    } catch (err: any) {
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (clientFilter && p.clientId !== clientFilter) return false;
    if (practiceFilter && p.practice !== practiceFilter) return false;
    if (healthFilter && p.healthStatus !== healthFilter) return false;
    if (managerFilter && p.managerId !== managerFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(query) ||
        p.code.toLowerCase().includes(query) ||
        p.clientName.toLowerCase().includes(query)
      );
    }
    return true;
  });

  const activeProjects = projects.filter((p) => p.status === 'active');
  const greenCount = activeProjects.filter((p) => p.healthStatus === 'green').length;
  const amberCount = activeProjects.filter((p) => p.healthStatus === 'amber').length;
  const redCount = activeProjects.filter((p) => p.healthStatus === 'red').length;

  const getHealthIndicator = (health: string) => {
    switch (health) {
      case 'green':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-sm text-emerald-700">On Track</span>
          </div>
        );
      case 'amber':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <span className="text-sm text-amber-700">At Risk</span>
          </div>
        );
      case 'red':
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-sm text-red-700">Critical</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-300" />
            <span className="text-sm text-slate-500">Not Set</span>
          </div>
        );
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Code',
      render: (p: Project) => (
        <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
          {p.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Name',
      render: (p: Project) => (
        <span className="font-medium text-slate-800">{p.name}</span>
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (p: Project) => <span className="text-slate-600">{p.clientName}</span>,
    },
    {
      key: 'managerName',
      header: 'Manager',
      render: (p: Project) => <span className="text-slate-600">{p.managerName}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (p: Project) => <StatusBadge status={p.status} />,
    },
    {
      key: 'healthStatus',
      header: 'Health',
      render: (p: Project) => getHealthIndicator(p.healthStatus),
    },
    {
      key: 'budget',
      header: 'Budget',
      render: (p: Project) => (
        <span className="text-slate-700 font-medium">{formatCurrency(p.budget)}</span>
      ),
    },
    {
      key: 'startDate',
      header: 'Start',
      render: (p: Project) => (
        <span className="text-slate-500 text-sm">{formatDate(p.startDate)}</span>
      ),
    },
    {
      key: 'endDate',
      header: 'End',
      render: (p: Project) => (
        <span className="text-slate-500 text-sm">{formatDate(p.endDate)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track and manage all active and past projects
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Active"
          value={activeProjects.length}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          }
          color="indigo"
        />
        <KPICard
          title="On Track"
          value={greenCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="emerald"
        />
        <KPICard
          title="At Risk"
          value={amberCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          }
          color="amber"
        />
        <KPICard
          title="Critical"
          value={redCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 0v.008H12v-.008zm9-3.75a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="red"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={clientFilter}
          onChange={(e) => setClientFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Clients</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={practiceFilter}
          onChange={(e) => setPracticeFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Practices</option>
          {PRACTICE_OPTIONS.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select
          value={healthFilter}
          onChange={(e) => setHealthFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Health</option>
          {HEALTH_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <select
          value={managerFilter}
          onChange={(e) => setManagerFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Managers</option>
          {managers.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={fetchData} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredProjects}
        loading={loading}
        onRowClick={(project) => navigate(`/projects/${project.id}`)}
        emptyMessage="No projects found matching your filters."
      />
    </div>
  );
};

export default ProjectsPage;
