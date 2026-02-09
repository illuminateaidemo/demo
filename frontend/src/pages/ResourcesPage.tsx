import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/common/KPICard';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';

interface Allocation {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  role: string;
  allocation: number;
  startDate: string;
  endDate: string;
}

interface Resource {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  grade: string;
  skills: string[];
  location: string;
  utilisationPercent: number;
  availableHours: number;
  totalHours: number;
  allocations: Allocation[];
}

interface ResourceDemand {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  role: string;
  grade: string;
  skills: string[];
  startDate: string;
  endDate: string;
  allocation: number;
  status: 'open' | 'fulfilled' | 'cancelled';
}

const GRADE_OPTIONS = ['Analyst', 'Consultant', 'Senior Consultant', 'Manager', 'Senior Manager', 'Director', 'Partner'];
const LOCATION_OPTIONS = ['London', 'Manchester', 'Edinburgh', 'Birmingham', 'Remote'];
const SKILL_OPTIONS = ['React', 'Python', 'Java', 'AWS', 'Azure', 'Data Analytics', 'Strategy', 'Finance', 'Change Management', 'Agile', 'DevOps', 'Machine Learning'];

const ResourcesPage: React.FC = () => {
  const [resources, setResources] = useState<Resource[]>([]);
  const [demands, setDemands] = useState<ResourceDemand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');

  // Detail
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resRes, demandRes] = await Promise.all([
        api.get('/resources'),
        api.get('/resource-demands'),
      ]);
      setResources(resRes.data.items || resRes.data);
      setDemands(demandRes.data.items || demandRes.data);
    } catch (err: any) {
      setError('Failed to load resources.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredResources = resources.filter((r) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
      if (!fullName.includes(query) && !r.role.toLowerCase().includes(query)) return false;
    }
    if (gradeFilter && r.grade !== gradeFilter) return false;
    if (locationFilter && r.location !== locationFilter) return false;
    if (skillFilter && !r.skills.includes(skillFilter)) return false;
    if (availabilityFilter === 'available' && r.utilisationPercent >= 100) return false;
    if (availabilityFilter === 'overallocated' && r.utilisationPercent < 100) return false;
    return true;
  });

  const totalResources = resources.length;
  const avgUtilisation = totalResources > 0
    ? Math.round(resources.reduce((sum, r) => sum + r.utilisationPercent, 0) / totalResources)
    : 0;
  const availableCount = resources.filter((r) => r.utilisationPercent < 80).length;
  const openDemands = demands.filter((d) => d.status === 'open').length;

  const getUtilisationColor = (percent: number): string => {
    if (percent > 100) return 'text-red-600';
    if (percent > 90) return 'text-amber-600';
    if (percent < 50) return 'text-red-500';
    return 'text-emerald-600';
  };

  const getUtilisationBg = (percent: number): string => {
    if (percent > 100) return 'bg-red-500';
    if (percent > 90) return 'bg-amber-500';
    if (percent < 50) return 'bg-red-400';
    return 'bg-emerald-500';
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (r: Resource) => (
        <div>
          <p className="font-medium text-slate-800">{r.firstName} {r.lastName}</p>
          <p className="text-xs text-slate-400">{r.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (r: Resource) => <span className="text-slate-600">{r.role}</span>,
    },
    {
      key: 'grade',
      header: 'Grade',
      render: (r: Resource) => <span className="text-slate-600">{r.grade}</span>,
    },
    {
      key: 'skills',
      header: 'Skills',
      render: (r: Resource) => (
        <div className="flex flex-wrap gap-1">
          {r.skills.slice(0, 3).map((skill) => (
            <span key={skill} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
              {skill}
            </span>
          ))}
          {r.skills.length > 3 && (
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              +{r.skills.length - 3}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (r: Resource) => <span className="text-slate-600">{r.location}</span>,
    },
    {
      key: 'utilisationPercent',
      header: 'Utilisation',
      render: (r: Resource) => (
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${getUtilisationBg(r.utilisationPercent)}`}
              style={{ width: `${Math.min(r.utilisationPercent, 100)}%` }}
            />
          </div>
          <span className={`text-sm font-semibold ${getUtilisationColor(r.utilisationPercent)}`}>
            {r.utilisationPercent}%
          </span>
        </div>
      ),
    },
    {
      key: 'availability',
      header: 'Availability',
      render: (r: Resource) => {
        const available = r.totalHours - (r.totalHours * r.utilisationPercent / 100);
        return (
          <span className={`text-sm font-medium ${available > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
            {Math.max(0, Math.round(available))} hrs
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Resources</h1>
        <p className="text-slate-500 text-sm mt-1">
          Resource capacity management and allocation overview
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total Resources"
          value={totalResources}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
            </svg>
          }
          color="indigo"
        />
        <KPICard
          title="Avg Utilisation"
          value={`${avgUtilisation}%`}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
          color="emerald"
        />
        <KPICard
          title="Available"
          value={availableCount}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
          }
          color="blue"
        />
        <KPICard
          title="Open Demands"
          value={openDemands}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
          color="amber"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex-1 min-w-[200px] relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search by name or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <select value={availabilityFilter} onChange={(e) => setAvailabilityFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Availability</option>
          <option value="available">Available (&lt;80%)</option>
          <option value="overallocated">Over-allocated (&gt;100%)</option>
        </select>
        <select value={gradeFilter} onChange={(e) => setGradeFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Grades</option>
          {GRADE_OPTIONS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Locations</option>
          {LOCATION_OPTIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select value={skillFilter} onChange={(e) => setSkillFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Skills</option>
          {SKILL_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
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
        data={filteredResources}
        loading={loading}
        onRowClick={(resource) => {
          setSelectedResource(resource);
          setShowDetail(true);
        }}
        emptyMessage="No resources found matching your filters."
      />

      {/* Resource Demands */}
      <Card title={`Resource Demands (${demands.filter((d) => d.status === 'open').length} open)`}>
        {demands.filter((d) => d.status === 'open').length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No open demands</p>
        ) : (
          <div className="space-y-2">
            {demands
              .filter((d) => d.status === 'open')
              .map((demand) => (
                <div key={demand.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700">{demand.role}</p>
                      <span className="text-xs text-slate-400">{demand.grade}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {demand.projectName} ({demand.projectCode}) &middot; {formatDate(demand.startDate)} - {formatDate(demand.endDate)} &middot; {demand.allocation}%
                    </p>
                    {demand.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {demand.skills.map((skill) => (
                          <span key={skill} className="inline-flex items-center rounded-full bg-indigo-50 px-2 py-0.5 text-xs text-indigo-600">
                            {skill}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-700">
                    Open
                  </span>
                </div>
              ))}
          </div>
        )}
      </Card>

      {/* Resource Detail Drawer */}
      {showDetail && selectedResource && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetail(false)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {selectedResource.firstName} {selectedResource.lastName}
                </h2>
                <p className="text-sm text-slate-500">{selectedResource.role} &middot; {selectedResource.grade}</p>
              </div>
              <button
                onClick={() => setShowDetail(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Resource Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Email</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedResource.email}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Location</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedResource.location}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Utilisation</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getUtilisationBg(selectedResource.utilisationPercent)}`}
                        style={{ width: `${Math.min(selectedResource.utilisationPercent, 100)}%` }}
                      />
                    </div>
                    <span className={`text-sm font-semibold ${getUtilisationColor(selectedResource.utilisationPercent)}`}>
                      {selectedResource.utilisationPercent}%
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Available Hours</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedResource.availableHours} hrs</p>
                </div>
              </div>

              {/* Skills */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedResource.skills.map((skill) => (
                    <span key={skill} className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Allocations Timeline */}
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Current Allocations</p>
                {(!selectedResource.allocations || selectedResource.allocations.length === 0) ? (
                  <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                    No current allocations
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedResource.allocations.map((alloc) => (
                      <div key={alloc.id} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-slate-700">{alloc.projectName}</p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {alloc.projectCode} &middot; {alloc.role}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-sm font-semibold text-indigo-600">{alloc.allocation}%</span>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                          </svg>
                          {formatDate(alloc.startDate)} - {formatDate(alloc.endDate)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourcesPage;
