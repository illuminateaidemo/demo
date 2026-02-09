import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/common/Card';
import Modal from '../components/common/Modal';
import StatusBadge from '../components/common/StatusBadge';
import FormField from '../components/common/FormField';

interface Phase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  budget: number;
  description: string;
}

interface TeamMember {
  id: string;
  userId: string;
  userName: string;
  role: string;
  grade: string;
  allocation: number;
  startDate: string;
  endDate: string;
}

interface HealthUpdate {
  id: string;
  status: 'green' | 'amber' | 'red';
  narrative: string;
  updatedBy: string;
  updatedAt: string;
}

interface BillingMilestone {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'ready' | 'invoiced' | 'paid';
}

interface ProjectFinancials {
  budgetHours: number;
  actualHours: number;
  budgetCost: number;
  actualCost: number;
  wipAmount: number;
  billedAmount: number;
  milestones: BillingMilestone[];
}

interface ProjectDetail {
  id: string;
  code: string;
  name: string;
  clientId: string;
  clientName: string;
  managerId: string;
  managerName: string;
  status: string;
  healthStatus: 'green' | 'amber' | 'red' | 'none';
  commercialModel: string;
  practice: string;
  budget: number;
  startDate: string;
  endDate: string;
  description: string;
  phases: Phase[];
  team: TeamMember[];
  healthHistory: HealthUpdate[];
  financials: ProjectFinancials;
}

type TabId = 'overview' | 'phases' | 'team' | 'financials' | 'health';

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'phases', label: 'Phases' },
  { id: 'team', label: 'Team' },
  { id: 'financials', label: 'Financials' },
  { id: 'health', label: 'Health History' },
];

const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Edit project
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    status: '',
    commercialModel: '',
    practice: '',
    budget: 0,
    startDate: '',
    endDate: '',
    description: '',
  });
  const [saving, setSaving] = useState(false);

  // Health update
  const [showHealthModal, setShowHealthModal] = useState(false);
  const [healthForm, setHealthForm] = useState({ status: 'green' as 'green' | 'amber' | 'red', narrative: '' });
  const [savingHealth, setSavingHealth] = useState(false);

  // Phase modal
  const [showPhaseModal, setShowPhaseModal] = useState(false);
  const [editingPhase, setEditingPhase] = useState<Phase | null>(null);
  const [phaseForm, setPhaseForm] = useState({ name: '', startDate: '', endDate: '', status: 'planned', budget: 0, description: '' });
  const [savingPhase, setSavingPhase] = useState(false);

  // Team modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamForm, setTeamForm] = useState({ userId: '', role: '', allocation: 100, startDate: '', endDate: '' });
  const [savingTeam, setSavingTeam] = useState(false);

  const fetchProject = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(`/projects/${id}`);
      setProject(response.data);
    } catch (err: any) {
      setError('Failed to load project details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

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

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'green': return { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'On Track' };
      case 'amber': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', label: 'At Risk' };
      case 'red': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'Critical' };
      default: return { bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400', label: 'Not Set' };
    }
  };

  const handleOpenEdit = () => {
    if (!project) return;
    setEditForm({
      name: project.name,
      status: project.status,
      commercialModel: project.commercialModel,
      practice: project.practice,
      budget: project.budget,
      startDate: project.startDate?.split('T')[0] || '',
      endDate: project.endDate?.split('T')[0] || '',
      description: project.description,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!project) return;
    setSaving(true);
    try {
      const response = await api.put(`/projects/${project.id}`, editForm);
      setProject({ ...project, ...response.data });
      setShowEditModal(false);
    } catch (err: any) {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleSaveHealth = async () => {
    if (!project) return;
    setSavingHealth(true);
    try {
      const response = await api.post(`/projects/${project.id}/health`, healthForm);
      setProject({
        ...project,
        healthStatus: healthForm.status,
        healthHistory: [response.data, ...(project.healthHistory || [])],
      });
      setShowHealthModal(false);
      setHealthForm({ status: 'green', narrative: '' });
    } catch (err: any) {
      // handle error
    } finally {
      setSavingHealth(false);
    }
  };

  const handleSavePhase = async () => {
    if (!project) return;
    setSavingPhase(true);
    try {
      if (editingPhase) {
        const response = await api.put(`/projects/${project.id}/phases/${editingPhase.id}`, phaseForm);
        setProject({
          ...project,
          phases: project.phases.map((p) => (p.id === editingPhase.id ? response.data : p)),
        });
      } else {
        const response = await api.post(`/projects/${project.id}/phases`, phaseForm);
        setProject({
          ...project,
          phases: [...(project.phases || []), response.data],
        });
      }
      setShowPhaseModal(false);
      setEditingPhase(null);
    } catch (err: any) {
      // handle error
    } finally {
      setSavingPhase(false);
    }
  };

  const handleSaveTeamMember = async () => {
    if (!project) return;
    setSavingTeam(true);
    try {
      const response = await api.post(`/projects/${project.id}/team`, teamForm);
      setProject({
        ...project,
        team: [...(project.team || []), response.data],
      });
      setShowTeamModal(false);
      setTeamForm({ userId: '', role: '', allocation: 100, startDate: '', endDate: '' });
    } catch (err: any) {
      // handle error
    } finally {
      setSavingTeam(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-500 text-sm">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-slate-700 font-medium mb-2">{error || 'Project not found'}</p>
          <button onClick={() => navigate('/projects')} className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">
            Back to Projects
          </button>
        </div>
      </div>
    );
  }

  const healthInfo = getHealthColor(project.healthStatus);

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Key Info Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</p>
          <div className="mt-2"><StatusBadge status={project.status} /></div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Commercial Model</p>
          <p className="mt-2 text-sm font-medium text-slate-700">{project.commercialModel || '-'}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Timeline</p>
          <p className="mt-2 text-sm text-slate-700">
            {formatDate(project.startDate)} - {formatDate(project.endDate)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Budget</p>
          <p className="mt-2 text-lg font-bold text-slate-800">{formatCurrency(project.budget)}</p>
        </div>
      </div>

      {/* Health Indicator */}
      <div className={`rounded-xl border p-4 flex items-center justify-between ${
        project.healthStatus === 'green' ? 'bg-emerald-50 border-emerald-200' :
        project.healthStatus === 'amber' ? 'bg-amber-50 border-amber-200' :
        project.healthStatus === 'red' ? 'bg-red-50 border-red-200' :
        'bg-slate-50 border-slate-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full ${healthInfo.dot}`} />
          <div>
            <p className={`font-semibold ${healthInfo.text}`}>Health: {healthInfo.label}</p>
            {project.healthHistory && project.healthHistory.length > 0 && (
              <p className="text-sm text-slate-500 mt-0.5">
                Last updated {formatDate(project.healthHistory[0].updatedAt)} by {project.healthHistory[0].updatedBy}
              </p>
            )}
          </div>
        </div>
        <button
          onClick={() => {
            setHealthForm({ status: project.healthStatus === 'none' ? 'green' : project.healthStatus, narrative: '' });
            setShowHealthModal(true);
          }}
          className="rounded-lg bg-white border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          Update Health
        </button>
      </div>

      {/* Details */}
      <Card title="Project Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Client</p>
            <p className="text-sm text-slate-700 mt-1">{project.clientName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Manager</p>
            <p className="text-sm text-slate-700 mt-1">{project.managerName}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Practice</p>
            <p className="text-sm text-slate-700 mt-1">{project.practice || '-'}</p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project Code</p>
            <p className="text-sm font-mono text-indigo-600 mt-1">{project.code}</p>
          </div>
          <div className="col-span-2">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</p>
            <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{project.description || '-'}</p>
          </div>
        </div>
      </Card>
    </div>
  );

  const renderPhases = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Project Phases</h3>
        <button
          onClick={() => {
            setEditingPhase(null);
            setPhaseForm({ name: '', startDate: '', endDate: '', status: 'planned', budget: 0, description: '' });
            setShowPhaseModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Phase
        </button>
      </div>

      {(!project.phases || project.phases.length === 0) ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400">No phases defined yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {project.phases.map((phase, index) => (
            <div key={phase.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{phase.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {formatDate(phase.startDate)} - {formatDate(phase.endDate)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={phase.status} />
                  <span className="text-sm font-medium text-slate-700">{formatCurrency(phase.budget)}</span>
                  <button
                    onClick={() => {
                      setEditingPhase(phase);
                      setPhaseForm({
                        name: phase.name,
                        startDate: phase.startDate?.split('T')[0] || '',
                        endDate: phase.endDate?.split('T')[0] || '',
                        status: phase.status,
                        budget: phase.budget,
                        description: phase.description,
                      });
                      setShowPhaseModal(true);
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              </div>
              {phase.description && (
                <p className="text-sm text-slate-500 mt-2 ml-11">{phase.description}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTeam = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Team Allocations</h3>
        <button
          onClick={() => {
            setTeamForm({ userId: '', role: '', allocation: 100, startDate: '', endDate: '' });
            setShowTeamModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Resource
        </button>
      </div>

      {(!project.team || project.team.length === 0) ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400">No team members allocated yet</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Allocation</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Period</th>
              </tr>
            </thead>
            <tbody>
              {project.team.map((member) => (
                <tr key={member.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-800">{member.userName}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{member.role}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{member.grade}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${member.allocation}%` }} />
                      </div>
                      <span className="text-sm text-slate-600">{member.allocation}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {formatDate(member.startDate)} - {formatDate(member.endDate)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const renderFinancials = () => {
    const fin = project.financials;
    if (!fin) {
      return (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400">No financial data available</p>
        </div>
      );
    }

    const hoursPercent = fin.budgetHours > 0 ? Math.round((fin.actualHours / fin.budgetHours) * 100) : 0;
    const costPercent = fin.budgetCost > 0 ? Math.round((fin.actualCost / fin.budgetCost) * 100) : 0;

    return (
      <div className="space-y-6">
        {/* Budget vs Actual */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card title="Hours">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium text-slate-700">{fin.budgetHours.toLocaleString()} hrs</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Actual</span>
                <span className="font-medium text-slate-700">{fin.actualHours.toLocaleString()} hrs</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${hoursPercent > 100 ? 'bg-red-500' : hoursPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(hoursPercent, 100)}%` }}
                />
              </div>
              <p className={`text-sm font-medium ${hoursPercent > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                {hoursPercent}% used
              </p>
            </div>
          </Card>
          <Card title="Cost">
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Budget</span>
                <span className="font-medium text-slate-700">{formatCurrency(fin.budgetCost)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Actual</span>
                <span className="font-medium text-slate-700">{formatCurrency(fin.actualCost)}</span>
              </div>
              <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${costPercent > 100 ? 'bg-red-500' : costPercent > 80 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(costPercent, 100)}%` }}
                />
              </div>
              <p className={`text-sm font-medium ${costPercent > 100 ? 'text-red-600' : 'text-slate-600'}`}>
                {costPercent}% used
              </p>
            </div>
          </Card>
        </div>

        {/* WIP Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Work in Progress</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(fin.wipAmount)}</p>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Billed Amount</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{formatCurrency(fin.billedAmount)}</p>
          </div>
        </div>

        {/* Billing Milestones */}
        <Card title="Billing Milestones">
          {(!fin.milestones || fin.milestones.length === 0) ? (
            <p className="text-sm text-slate-400 py-4 text-center">No billing milestones</p>
          ) : (
            <div className="space-y-2">
              {fin.milestones.map((ms) => (
                <div key={ms.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{ms.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">Due: {formatDate(ms.dueDate)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-700">{formatCurrency(ms.amount)}</span>
                    <StatusBadge status={ms.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    );
  };

  const renderHealthHistory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Health Update History</h3>
        <button
          onClick={() => {
            setHealthForm({ status: project.healthStatus === 'none' ? 'green' : project.healthStatus, narrative: '' });
            setShowHealthModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          Add Update
        </button>
      </div>

      {(!project.healthHistory || project.healthHistory.length === 0) ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <p className="text-slate-400">No health updates recorded</p>
        </div>
      ) : (
        <div className="space-y-4">
          {project.healthHistory.map((update, index) => {
            const color = getHealthColor(update.status);
            return (
              <div key={update.id} className="relative pl-8">
                {index < project.healthHistory.length - 1 && (
                  <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-slate-200" />
                )}
                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full ${color.bg} flex items-center justify-center`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
                </div>
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${color.bg} ${color.text}`}>
                      {color.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {formatDate(update.updatedAt)} by {update.updatedBy}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{update.narrative}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/projects')}
            className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition mb-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to Projects
          </button>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
            <span className="font-mono text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {project.code}
            </span>
          </div>
          <p className="text-slate-500 text-sm mt-1">{project.clientName}</p>
        </div>
        <button
          onClick={handleOpenEdit}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          Edit Project
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'phases' && renderPhases()}
      {activeTab === 'team' && renderTeam()}
      {activeTab === 'financials' && renderFinancials()}
      {activeTab === 'health' && renderHealthHistory()}

      {/* Edit Project Modal */}
      <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Project">
        <div className="space-y-4">
          <FormField label="Project Name" required>
            <input
              type="text"
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="on_hold">On Hold</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </FormField>
            <FormField label="Commercial Model">
              <select value={editForm.commercialModel} onChange={(e) => setEditForm({ ...editForm, commercialModel: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="">Select model</option>
                <option value="time_and_materials">Time & Materials</option>
                <option value="fixed_price">Fixed Price</option>
                <option value="retainer">Retainer</option>
                <option value="milestone">Milestone-based</option>
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Practice">
              <select value={editForm.practice} onChange={(e) => setEditForm({ ...editForm, practice: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="">Select practice</option>
                {['Strategy','Technology','Operations','Finance','Risk','People','Digital'].map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Budget">
              <input type="number" value={editForm.budget} onChange={(e) => setEditForm({ ...editForm, budget: parseFloat(e.target.value) || 0 })} min={0} step={1000} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input type="date" value={editForm.startDate} onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={editForm.endDate} onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none" />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowEditModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSaveEdit} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Health Update Modal */}
      <Modal isOpen={showHealthModal} onClose={() => setShowHealthModal(false)} title="Update Health Status">
        <div className="space-y-4">
          <FormField label="Status">
            <div className="flex gap-3">
              {(['green', 'amber', 'red'] as const).map((s) => {
                const info = getHealthColor(s);
                return (
                  <button
                    key={s}
                    onClick={() => setHealthForm({ ...healthForm, status: s })}
                    className={`flex-1 rounded-lg border-2 p-3 text-center transition ${
                      healthForm.status === s
                        ? `${info.bg} border-current ${info.text}`
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-full mx-auto mb-1 ${info.dot}`} />
                    <span className="text-sm font-medium">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </FormField>
          <FormField label="Narrative" required>
            <textarea
              value={healthForm.narrative}
              onChange={(e) => setHealthForm({ ...healthForm, narrative: e.target.value })}
              placeholder="Describe the current project health, risks, and actions..."
              rows={4}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowHealthModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSaveHealth} disabled={savingHealth || !healthForm.narrative.trim()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {savingHealth ? 'Saving...' : 'Save Update'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Phase Modal */}
      <Modal isOpen={showPhaseModal} onClose={() => setShowPhaseModal(false)} title={editingPhase ? 'Edit Phase' : 'Add Phase'}>
        <div className="space-y-4">
          <FormField label="Phase Name" required>
            <input type="text" value={phaseForm.name} onChange={(e) => setPhaseForm({ ...phaseForm, name: e.target.value })} placeholder="e.g. Discovery, Design, Build" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input type="date" value={phaseForm.startDate} onChange={(e) => setPhaseForm({ ...phaseForm, startDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={phaseForm.endDate} onChange={(e) => setPhaseForm({ ...phaseForm, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select value={phaseForm.status} onChange={(e) => setPhaseForm({ ...phaseForm, status: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="planned">Planned</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
            </FormField>
            <FormField label="Budget">
              <input type="number" value={phaseForm.budget} onChange={(e) => setPhaseForm({ ...phaseForm, budget: parseFloat(e.target.value) || 0 })} min={0} step={1000} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <FormField label="Description">
            <textarea value={phaseForm.description} onChange={(e) => setPhaseForm({ ...phaseForm, description: e.target.value })} rows={2} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none" />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowPhaseModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSavePhase} disabled={savingPhase} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {editingPhase ? 'Update Phase' : 'Add Phase'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Team Member Modal */}
      <Modal isOpen={showTeamModal} onClose={() => setShowTeamModal(false)} title="Add Team Member">
        <div className="space-y-4">
          <FormField label="Resource" required>
            <input type="text" value={teamForm.userId} onChange={(e) => setTeamForm({ ...teamForm, userId: e.target.value })} placeholder="Search for a resource..." className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <FormField label="Role">
            <input type="text" value={teamForm.role} onChange={(e) => setTeamForm({ ...teamForm, role: e.target.value })} placeholder="e.g. Lead Developer, Analyst" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <FormField label="Allocation (%)">
            <input type="number" value={teamForm.allocation} onChange={(e) => setTeamForm({ ...teamForm, allocation: parseInt(e.target.value) || 0 })} min={0} max={100} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Start Date">
              <input type="date" value={teamForm.startDate} onChange={(e) => setTeamForm({ ...teamForm, startDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="End Date">
              <input type="date" value={teamForm.endDate} onChange={(e) => setTeamForm({ ...teamForm, endDate: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowTeamModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSaveTeamMember} disabled={savingTeam} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {savingTeam ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectDetailPage;
