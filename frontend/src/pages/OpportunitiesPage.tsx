import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface Opportunity {
  id: string;
  name: string;
  clientId: string;
  clientName: string;
  value: number;
  probability: number;
  status: 'lead' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';
  expectedStartDate: string;
  owner: string;
  ownerId: string;
  practice: string;
  description: string;
  createdAt: string;
}

interface ClientOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  name: string;
}

const STATUS_OPTIONS: { value: Opportunity['status']; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-slate-100 text-slate-700' },
  { value: 'qualified', label: 'Qualified', color: 'bg-blue-100 text-blue-700' },
  { value: 'proposal', label: 'Proposal', color: 'bg-indigo-100 text-indigo-700' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-100 text-amber-700' },
  { value: 'won', label: 'Won', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'lost', label: 'Lost', color: 'bg-red-100 text-red-700' },
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

const PIPELINE_STATUSES: Opportunity['status'][] = ['lead', 'qualified', 'proposal', 'negotiation', 'won'];

const emptyForm = {
  name: '',
  clientId: '',
  value: 0,
  probability: 50,
  status: 'lead' as Opportunity['status'],
  expectedStartDate: '',
  ownerId: '',
  practice: '',
  description: '',
};

const OpportunitiesPage: React.FC = () => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [ownerFilter, setOwnerFilter] = useState('');
  const [practiceFilter, setPracticeFilter] = useState('');

  // View mode
  const [viewMode, setViewMode] = useState<'table' | 'pipeline'>('table');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Opportunity | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Convert confirm
  const [showConvertConfirm, setShowConvertConfirm] = useState(false);
  const [convertingOpp, setConvertingOpp] = useState<Opportunity | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [oppRes, clientRes, userRes] = await Promise.all([
        api.get('/opportunities'),
        api.get('/clients', { params: { status: 'active' } }),
        api.get('/users'),
      ]);
      setOpportunities(oppRes.data.items || oppRes.data);
      setClients((clientRes.data.items || clientRes.data).map((c: any) => ({ id: c.id, name: c.name })));
      setUsers((userRes.data.items || userRes.data).map((u: any) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` })));
    } catch (err: any) {
      setError('Failed to load opportunities.');
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

  const filteredOpps = opportunities.filter((opp) => {
    if (statusFilter && opp.status !== statusFilter) return false;
    if (clientFilter && opp.clientId !== clientFilter) return false;
    if (ownerFilter && opp.ownerId !== ownerFilter) return false;
    if (practiceFilter && opp.practice !== practiceFilter) return false;
    return true;
  });

  const pipelineSummary = STATUS_OPTIONS.map((s) => {
    const opps = opportunities.filter((o) => o.status === s.value);
    const total = opps.reduce((sum, o) => sum + o.value, 0);
    return { ...s, count: opps.length, total };
  });

  const handleAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const handleEdit = (opp: Opportunity) => {
    setEditing(opp);
    setForm({
      name: opp.name,
      clientId: opp.clientId,
      value: opp.value,
      probability: opp.probability,
      status: opp.status,
      expectedStartDate: opp.expectedStartDate?.split('T')[0] || '',
      ownerId: opp.ownerId,
      practice: opp.practice,
      description: opp.description,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setFormError('Opportunity name is required.');
      return;
    }
    if (!form.clientId) {
      setFormError('Client is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const response = await api.put(`/opportunities/${editing.id}`, form);
        setOpportunities((prev) =>
          prev.map((o) => (o.id === editing.id ? { ...o, ...response.data } : o))
        );
      } else {
        const response = await api.post('/opportunities', form);
        setOpportunities((prev) => [response.data, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save opportunity.');
    } finally {
      setSaving(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!convertingOpp) return;
    try {
      await api.post(`/opportunities/${convertingOpp.id}/convert`);
      setOpportunities((prev) =>
        prev.map((o) =>
          o.id === convertingOpp.id ? { ...o, status: 'won' as const } : o
        )
      );
      setShowConvertConfirm(false);
      setConvertingOpp(null);
      fetchData();
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to convert opportunity.');
      setShowConvertConfirm(false);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (opp: Opportunity) => (
        <span className="font-medium text-slate-800">{opp.name}</span>
      ),
    },
    {
      key: 'clientName',
      header: 'Client',
      render: (opp: Opportunity) => (
        <span className="text-slate-600">{opp.clientName}</span>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (opp: Opportunity) => (
        <span className="font-medium text-slate-700">{formatCurrency(opp.value)}</span>
      ),
    },
    {
      key: 'probability',
      header: 'Probability',
      render: (opp: Opportunity) => (
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full"
              style={{ width: `${opp.probability}%` }}
            />
          </div>
          <span className="text-sm text-slate-600">{opp.probability}%</span>
        </div>
      ),
    },
    {
      key: 'expectedStartDate',
      header: 'Expected Start',
      render: (opp: Opportunity) => (
        <span className="text-slate-500 text-sm">{formatDate(opp.expectedStartDate)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (opp: Opportunity) => <StatusBadge status={opp.status} />,
    },
    {
      key: 'owner',
      header: 'Owner',
      render: (opp: Opportunity) => (
        <span className="text-slate-600">{opp.owner}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (opp: Opportunity) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEdit(opp);
            }}
            className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          {opp.status === 'won' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConvertingOpp(opp);
                setShowConvertConfirm(true);
              }}
              className="p-1.5 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition"
              title="Convert to Project"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
              </svg>
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Opportunities</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your sales pipeline and opportunities
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-300 overflow-hidden">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'table'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Table
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'pipeline'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              Pipeline
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Opportunity
          </button>
        </div>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {pipelineSummary.map((stage) => (
          <div
            key={stage.value}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition cursor-pointer"
            onClick={() => setStatusFilter(statusFilter === stage.value ? '' : stage.value)}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stage.color}`}>
                {stage.label}
              </span>
              <span className="text-xs text-slate-400">{stage.count}</span>
            </div>
            <p className="text-lg font-bold text-slate-800">{formatCurrency(stage.total)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
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
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        >
          <option value="">All Owners</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
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
        {(statusFilter || clientFilter || ownerFilter || practiceFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setClientFilter('');
              setOwnerFilter('');
              setPracticeFilter('');
            }}
            className="text-sm text-slate-500 hover:text-slate-700 underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={fetchData} className="ml-2 underline">Retry</button>
        </div>
      )}

      {/* Table View */}
      {viewMode === 'table' && (
        <DataTable
          columns={columns}
          data={filteredOpps}
          loading={loading}
          onRowClick={handleEdit}
          emptyMessage="No opportunities found."
        />
      )}

      {/* Pipeline/Kanban View */}
      {viewMode === 'pipeline' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PIPELINE_STATUSES.map((status) => {
            const stageInfo = STATUS_OPTIONS.find((s) => s.value === status);
            const stageOpps = filteredOpps.filter((o) => o.status === status);
            const stageTotal = stageOpps.reduce((sum, o) => sum + o.value, 0);

            return (
              <div
                key={status}
                className="flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-slate-200"
              >
                <div className="p-3 border-b border-slate-200">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${stageInfo?.color}`}>
                      {stageInfo?.label}
                    </span>
                    <span className="text-xs text-slate-400">{stageOpps.length}</span>
                  </div>
                  <p className="text-sm font-semibold text-slate-700 mt-1">{formatCurrency(stageTotal)}</p>
                </div>
                <div className="p-2 space-y-2 max-h-[60vh] overflow-y-auto">
                  {stageOpps.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6">No opportunities</p>
                  ) : (
                    stageOpps.map((opp) => (
                      <div
                        key={opp.id}
                        onClick={() => handleEdit(opp)}
                        className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md hover:border-indigo-200 transition"
                      >
                        <p className="text-sm font-medium text-slate-800 truncate">{opp.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{opp.clientName}</p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-semibold text-slate-700">
                            {formatCurrency(opp.value)}
                          </span>
                          <span className="text-xs text-slate-400">{opp.probability}%</span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-slate-400">{opp.owner}</span>
                          {opp.status === 'won' && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConvertingOpp(opp);
                                setShowConvertConfirm(true);
                              }}
                              className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                            >
                              Convert
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Opportunity' : 'Add Opportunity'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <FormField label="Opportunity Name" required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Digital Transformation Programme"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Client" required>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Owner">
              <select
                value={form.ownerId}
                onChange={(e) => setForm({ ...form, ownerId: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="">Select owner</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Value">
              <input
                type="number"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: parseFloat(e.target.value) || 0 })}
                min={0}
                step={1000}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </FormField>
            <FormField label="Probability (%)">
              <input
                type="number"
                value={form.probability}
                onChange={(e) => setForm({ ...form, probability: parseInt(e.target.value) || 0 })}
                min={0}
                max={100}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Status">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as Opportunity['status'] })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Practice">
              <select
                value={form.practice}
                onChange={(e) => setForm({ ...form, practice: e.target.value })}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              >
                <option value="">Select practice</option>
                {PRACTICE_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Expected Start Date">
            <input
              type="date"
              value={form.expectedStartDate}
              onChange={(e) => setForm({ ...form, expectedStartDate: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <FormField label="Description">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Describe the opportunity..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowModal(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Convert to Project Confirm */}
      <ConfirmDialog
        isOpen={showConvertConfirm}
        onClose={() => {
          setShowConvertConfirm(false);
          setConvertingOpp(null);
        }}
        onConfirm={handleConvertToProject}
        title="Convert to Project"
        message={`Are you sure you want to convert "${convertingOpp?.name}" into a project? This will create a new project based on this opportunity.`}
        confirmLabel="Convert"
        variant="primary"
      />
    </div>
  );
};

export default OpportunitiesPage;
