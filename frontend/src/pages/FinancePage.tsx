import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import KPICard from '../components/common/KPICard';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import Modal from '../components/common/Modal';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface WIPEntry {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  period: string;
  hours: number;
  cost: number;
  revenue: number;
  status: 'draft' | 'reviewed' | 'posted';
}

interface BillingMilestone {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  name: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: 'pending' | 'ready' | 'invoiced' | 'paid';
  invoiceRef?: string;
  paidDate?: string;
}

interface PostingPeriod {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: 'open' | 'closed' | 'locked';
  wipCount: number;
  totalRevenue: number;
}

type TabId = 'wip' | 'billing' | 'periods' | 'export';

const TABS: { id: TabId; label: string }[] = [
  { id: 'wip', label: 'WIP Review' },
  { id: 'billing', label: 'Billing' },
  { id: 'periods', label: 'Periods' },
  { id: 'export', label: 'Export' },
];

const FinancePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('wip');

  // WIP state
  const [wipEntries, setWipEntries] = useState<WIPEntry[]>([]);
  const [wipLoading, setWipLoading] = useState(true);
  const [wipProjectFilter, setWipProjectFilter] = useState('');
  const [wipPeriodFilter, setWipPeriodFilter] = useState('');
  const [wipStatusFilter, setWipStatusFilter] = useState('');

  // Billing state
  const [milestones, setMilestones] = useState<BillingMilestone[]>([]);
  const [billingLoading, setBillingLoading] = useState(true);
  const [billingStatusFilter, setBillingStatusFilter] = useState('');
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<BillingMilestone | null>(null);
  const [milestoneAction, setMilestoneAction] = useState('');

  // Periods state
  const [periods, setPeriods] = useState<PostingPeriod[]>([]);
  const [periodsLoading, setPeriodsLoading] = useState(true);
  const [showPeriodConfirm, setShowPeriodConfirm] = useState(false);
  const [periodAction, setPeriodAction] = useState<{ id: string; action: string } | null>(null);

  // Export state
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportType, setExportType] = useState('wip');
  const [exportPeriod, setExportPeriod] = useState('');
  const [exporting, setExporting] = useState(false);

  // Summary KPIs
  const [kpis, setKpis] = useState({
    totalWIP: 0,
    unbilledRevenue: 0,
    outstandingInvoices: 0,
  });

  const [error, setError] = useState<string | null>(null);

  const fetchKPIs = useCallback(async () => {
    try {
      const response = await api.get('/finance/kpis');
      setKpis(response.data);
    } catch (err: any) {
      // KPIs are best-effort
    }
  }, []);

  const fetchWIP = useCallback(async () => {
    setWipLoading(true);
    try {
      const params: Record<string, string> = {};
      if (wipProjectFilter) params.projectId = wipProjectFilter;
      if (wipPeriodFilter) params.period = wipPeriodFilter;
      if (wipStatusFilter) params.status = wipStatusFilter;
      const response = await api.get('/finance/wip', { params });
      setWipEntries(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load WIP entries.');
    } finally {
      setWipLoading(false);
    }
  }, [wipProjectFilter, wipPeriodFilter, wipStatusFilter]);

  const fetchBilling = useCallback(async () => {
    setBillingLoading(true);
    try {
      const params: Record<string, string> = {};
      if (billingStatusFilter) params.status = billingStatusFilter;
      const response = await api.get('/finance/billing-milestones', { params });
      setMilestones(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load billing milestones.');
    } finally {
      setBillingLoading(false);
    }
  }, [billingStatusFilter]);

  const fetchPeriods = useCallback(async () => {
    setPeriodsLoading(true);
    try {
      const response = await api.get('/finance/periods');
      setPeriods(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load posting periods.');
    } finally {
      setPeriodsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKPIs();
  }, [fetchKPIs]);

  useEffect(() => {
    if (activeTab === 'wip') fetchWIP();
  }, [activeTab, fetchWIP]);

  useEffect(() => {
    if (activeTab === 'billing') fetchBilling();
  }, [activeTab, fetchBilling]);

  useEffect(() => {
    if (activeTab === 'periods' || activeTab === 'export') fetchPeriods();
  }, [activeTab, fetchPeriods]);

  const formatCurrency = (value: number, currency: string = 'GBP'): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
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

  const handleWIPAction = async (id: string, action: 'review' | 'post') => {
    try {
      const response = await api.post(`/finance/wip/${id}/${action}`);
      setWipEntries((prev) => prev.map((w) => (w.id === id ? { ...w, ...response.data } : w)));
      fetchKPIs();
    } catch (err: any) {
      setError(`Failed to ${action} WIP entry.`);
    }
  };

  const handleMilestoneStatusChange = async () => {
    if (!selectedMilestone || !milestoneAction) return;
    try {
      const response = await api.put(`/finance/billing-milestones/${selectedMilestone.id}/status`, {
        status: milestoneAction,
      });
      setMilestones((prev) =>
        prev.map((m) => (m.id === selectedMilestone.id ? { ...m, ...response.data } : m))
      );
      setShowMilestoneModal(false);
      setSelectedMilestone(null);
      fetchKPIs();
    } catch (err: any) {
      setError('Failed to update milestone status.');
    }
  };

  const handlePeriodAction = async () => {
    if (!periodAction) return;
    try {
      await api.post(`/finance/periods/${periodAction.id}/${periodAction.action}`);
      fetchPeriods();
      setShowPeriodConfirm(false);
      setPeriodAction(null);
    } catch (err: any) {
      setError(`Failed to ${periodAction.action} period.`);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/finance/export', {
        params: { format: exportFormat, type: exportType, period: exportPeriod },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `finance-export-${exportType}.${exportFormat}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError('Failed to generate export.');
    } finally {
      setExporting(false);
    }
  };

  const wipColumns = [
    {
      key: 'project',
      header: 'Project',
      render: (w: WIPEntry) => (
        <div>
          <span className="text-sm font-medium text-slate-800">{w.projectName}</span>
          <span className="text-xs text-slate-400 ml-1">({w.projectCode})</span>
        </div>
      ),
    },
    { key: 'period', header: 'Period', render: (w: WIPEntry) => <span className="text-slate-600">{w.period}</span> },
    { key: 'hours', header: 'Hours', render: (w: WIPEntry) => <span className="text-slate-700">{w.hours.toLocaleString()}</span> },
    { key: 'cost', header: 'Cost', render: (w: WIPEntry) => <span className="text-slate-700">{formatCurrency(w.cost)}</span> },
    { key: 'revenue', header: 'Revenue', render: (w: WIPEntry) => <span className="font-medium text-slate-800">{formatCurrency(w.revenue)}</span> },
    { key: 'status', header: 'Status', render: (w: WIPEntry) => <StatusBadge status={w.status} /> },
    {
      key: 'actions',
      header: '',
      render: (w: WIPEntry) => (
        <div className="flex items-center gap-1">
          {w.status === 'draft' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleWIPAction(w.id, 'review'); }}
              className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
            >
              Review
            </button>
          )}
          {w.status === 'reviewed' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleWIPAction(w.id, 'post'); }}
              className="rounded px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 transition"
            >
              Post
            </button>
          )}
        </div>
      ),
    },
  ];

  const billingColumns = [
    {
      key: 'project',
      header: 'Project',
      render: (m: BillingMilestone) => (
        <div>
          <span className="text-sm font-medium text-slate-800">{m.projectName}</span>
          <span className="text-xs text-slate-400 ml-1">({m.projectCode})</span>
        </div>
      ),
    },
    { key: 'name', header: 'Milestone', render: (m: BillingMilestone) => <span className="text-slate-700">{m.name}</span> },
    { key: 'amount', header: 'Amount', render: (m: BillingMilestone) => <span className="font-medium text-slate-800">{formatCurrency(m.amount, m.currency)}</span> },
    { key: 'dueDate', header: 'Due Date', render: (m: BillingMilestone) => <span className="text-slate-500 text-sm">{formatDate(m.dueDate)}</span> },
    { key: 'status', header: 'Status', render: (m: BillingMilestone) => <StatusBadge status={m.status} /> },
    { key: 'invoiceRef', header: 'Invoice Ref', render: (m: BillingMilestone) => <span className="text-slate-500 text-sm">{m.invoiceRef || '-'}</span> },
    {
      key: 'actions',
      header: '',
      render: (m: BillingMilestone) => {
        const nextStatus = m.status === 'pending' ? 'ready' : m.status === 'ready' ? 'invoiced' : m.status === 'invoiced' ? 'paid' : null;
        const nextLabel = m.status === 'pending' ? 'Mark Ready' : m.status === 'ready' ? 'Mark Invoiced' : m.status === 'invoiced' ? 'Mark Paid' : null;
        if (!nextStatus || !nextLabel) return null;
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMilestone(m);
              setMilestoneAction(nextStatus);
              setShowMilestoneModal(true);
            }}
            className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
          >
            {nextLabel}
          </button>
        );
      },
    },
  ];

  const renderWIP = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={wipStatusFilter} onChange={(e) => setWipStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="reviewed">Reviewed</option>
          <option value="posted">Posted</option>
        </select>
        <input
          type="text"
          value={wipPeriodFilter}
          onChange={(e) => setWipPeriodFilter(e.target.value)}
          placeholder="Filter by period (e.g. 2025-01)"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
        />
      </div>
      <DataTable columns={wipColumns} data={wipEntries} loading={wipLoading} emptyMessage="No WIP entries found." />
    </div>
  );

  const renderBilling = () => (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select value={billingStatusFilter} onChange={(e) => setBillingStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="ready">Ready</option>
          <option value="invoiced">Invoiced</option>
          <option value="paid">Paid</option>
        </select>
      </div>
      <DataTable columns={billingColumns} data={milestones} loading={billingLoading} emptyMessage="No billing milestones found." />
    </div>
  );

  const renderPeriods = () => (
    <div className="space-y-4">
      {periodsLoading ? (
        <div className="flex items-center justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="space-y-3">
          {periods.map((period) => (
            <div key={period.id} className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-800">{period.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {formatDate(period.startDate)} - {formatDate(period.endDate)} &middot; {period.wipCount} WIP entries &middot; {formatCurrency(period.totalRevenue)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={period.status} />
                {period.status === 'open' && (
                  <button
                    onClick={() => {
                      setPeriodAction({ id: period.id, action: 'close' });
                      setShowPeriodConfirm(true);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Close Period
                  </button>
                )}
                {period.status === 'closed' && (
                  <button
                    onClick={() => {
                      setPeriodAction({ id: period.id, action: 'reopen' });
                      setShowPeriodConfirm(true);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
          {periods.length === 0 && (
            <p className="text-sm text-slate-400 py-8 text-center">No posting periods configured</p>
          )}
        </div>
      )}
    </div>
  );

  const renderExport = () => (
    <div className="space-y-6">
      <Card title="Export Financial Data">
        <div className="space-y-4 max-w-md">
          <FormField label="Export Type">
            <select value={exportType} onChange={(e) => setExportType(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="wip">WIP Report</option>
              <option value="billing">Billing Report</option>
              <option value="revenue">Revenue Report</option>
              <option value="timesheet">Timesheet Summary</option>
              <option value="expense">Expense Summary</option>
            </select>
          </FormField>
          <FormField label="Period">
            <select value={exportPeriod} onChange={(e) => setExportPeriod(e.target.value)} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="">All Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Format">
            <div className="flex gap-3">
              {['csv', 'xlsx', 'json'].map((fmt) => (
                <button
                  key={fmt}
                  onClick={() => setExportFormat(fmt)}
                  className={`flex-1 rounded-lg border-2 px-4 py-2.5 text-sm font-medium transition uppercase ${
                    exportFormat === fmt
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-slate-200 text-slate-500 hover:border-slate-300'
                  }`}
                >
                  {fmt}
                </button>
              ))}
            </div>
          </FormField>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2"
          >
            {exporting ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Generating...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
                Export Data
              </>
            )}
          </button>
        </div>
      </Card>

      <Card title="ERP Integration">
        <div className="space-y-3">
          <p className="text-sm text-slate-600">
            Export data in formats compatible with your ERP system for seamless integration.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">SAP Format</p>
              <p className="text-xs text-slate-400 mt-0.5">IDoc/BAPI compatible</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.375 19.5h17.25m-17.25 0a1.125 1.125 0 01-1.125-1.125M3.375 19.5h7.5c.621 0 1.125-.504 1.125-1.125m-9.75 0V5.625m0 12.75v-1.5c0-.621.504-1.125 1.125-1.125m18.375 2.625V5.625m0 12.75c0 .621-.504 1.125-1.125 1.125m1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125m0 3.75h-7.5A1.125 1.125 0 0112 18.375m9.75-12.75c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125m19.5 0v1.5c0 .621-.504 1.125-1.125 1.125M2.25 5.625v1.5c0 .621.504 1.125 1.125 1.125m0 0h17.25m-17.25 0h7.5c.621 0 1.125.504 1.125 1.125M3.375 8.25c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125m17.25-3.75h-7.5c-.621 0-1.125.504-1.125 1.125m8.625-1.125c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125M12 10.875v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 10.875c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125M13.125 12h7.5m-7.5 0c-.621 0-1.125.504-1.125 1.125M20.625 12c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125m-17.25 0h7.5M12 14.625v-1.5m0 1.5c0 .621-.504 1.125-1.125 1.125M12 14.625c0 .621.504 1.125 1.125 1.125m-2.25 0c.621 0 1.125.504 1.125 1.125m0 0v1.5c0 .621-.504 1.125-1.125 1.125m1.125-1.125c0 .621.504 1.125 1.125 1.125" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">Xero Format</p>
              <p className="text-xs text-slate-400 mt-0.5">Direct API integration</p>
            </div>
            <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 text-center">
              <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center mx-auto mb-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                </svg>
              </div>
              <p className="text-sm font-medium text-slate-700">Custom API</p>
              <p className="text-xs text-slate-400 mt-0.5">REST/JSON endpoint</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Finance</h1>
        <p className="text-slate-500 text-sm mt-1">
          Financial control center - WIP, billing, and revenue management
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Total WIP"
          value={formatCurrency(kpis.totalWIP)}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          color="indigo"
        />
        <KPICard
          title="Unbilled Revenue"
          value={formatCurrency(kpis.unbilledRevenue)}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          }
          color="amber"
        />
        <KPICard
          title="Outstanding Invoices"
          value={formatCurrency(kpis.outstandingInvoices)}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          }
          color="red"
        />
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

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'wip' && renderWIP()}
      {activeTab === 'billing' && renderBilling()}
      {activeTab === 'periods' && renderPeriods()}
      {activeTab === 'export' && renderExport()}

      {/* Milestone Status Modal */}
      <Modal isOpen={showMilestoneModal} onClose={() => setShowMilestoneModal(false)} title="Update Milestone Status">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Change status of <span className="font-medium">{selectedMilestone?.name}</span> to{' '}
            <span className="font-medium capitalize">{milestoneAction}</span>?
          </p>
          {milestoneAction === 'invoiced' && (
            <FormField label="Invoice Reference">
              <input type="text" placeholder="INV-001" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowMilestoneModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleMilestoneStatusChange} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition">
              Confirm
            </button>
          </div>
        </div>
      </Modal>

      {/* Period Action Confirm */}
      <ConfirmDialog
        isOpen={showPeriodConfirm}
        onClose={() => { setShowPeriodConfirm(false); setPeriodAction(null); }}
        onConfirm={handlePeriodAction}
        title={`${periodAction?.action === 'close' ? 'Close' : 'Reopen'} Period`}
        message={`Are you sure you want to ${periodAction?.action} this posting period? ${periodAction?.action === 'close' ? 'No further transactions can be posted to a closed period.' : ''}`}
        confirmLabel={periodAction?.action === 'close' ? 'Close Period' : 'Reopen Period'}
        variant={periodAction?.action === 'close' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default FinancePage;
