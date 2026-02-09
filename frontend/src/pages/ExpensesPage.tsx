import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface Expense {
  id: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  category: string;
  description: string;
  amount: number;
  currency: string;
  date: string;
  receiptRef: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'paid';
  submittedAt?: string;
  approvalHistory: ApprovalEntry[];
}

interface ApprovalEntry {
  id: string;
  action: string;
  by: string;
  at: string;
  notes?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

const CATEGORY_OPTIONS = [
  'Travel',
  'Accommodation',
  'Meals & Entertainment',
  'Equipment',
  'Software & Subscriptions',
  'Training',
  'Office Supplies',
  'Telecommunications',
  'Professional Services',
  'Other',
];

const CURRENCY_OPTIONS = ['GBP', 'USD', 'EUR'];

const emptyForm = {
  projectId: '',
  category: '',
  description: '',
  amount: 0,
  currency: 'GBP',
  date: new Date().toISOString().split('T')[0],
  receiptRef: '',
};

const ExpensesPage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');

  // Modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail view
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // Submit confirm
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [expRes, projRes] = await Promise.all([
        api.get('/expenses'),
        api.get('/projects', { params: { status: 'active' } }),
      ]);
      setExpenses(expRes.data.items || expRes.data);
      setProjects((projRes.data.items || projRes.data).map((p: any) => ({ id: p.id, name: p.name, code: p.code })));
    } catch (err: any) {
      setError('Failed to load expenses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatCurrency = (amount: number, currency: string = 'GBP'): string => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredExpenses = expenses.filter((e) => {
    if (statusFilter && e.status !== statusFilter) return false;
    if (projectFilter && e.projectId !== projectFilter) return false;
    if (categoryFilter && e.category !== categoryFilter) return false;
    if (dateFromFilter && e.date < dateFromFilter) return false;
    if (dateToFilter && e.date > dateToFilter) return false;
    return true;
  });

  const draftExpenses = filteredExpenses.filter((e) => e.status === 'draft');

  const handleAdd = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setShowModal(true);
  };

  const handleEdit = (expense: Expense) => {
    if (expense.status !== 'draft') {
      setSelectedExpense(expense);
      setShowDetail(true);
      return;
    }
    setEditing(expense);
    setForm({
      projectId: expense.projectId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date?.split('T')[0] || '',
      receiptRef: expense.receiptRef,
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.projectId) {
      setFormError('Project is required.');
      return;
    }
    if (!form.category) {
      setFormError('Category is required.');
      return;
    }
    if (form.amount <= 0) {
      setFormError('Amount must be greater than zero.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editing) {
        const response = await api.put(`/expenses/${editing.id}`, form);
        setExpenses((prev) => prev.map((e) => (e.id === editing.id ? { ...e, ...response.data } : e)));
      } else {
        const response = await api.post('/expenses', form);
        setExpenses((prev) => [response.data, ...prev]);
      }
      setShowModal(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSingle = async (expenseId: string) => {
    try {
      const response = await api.post(`/expenses/${expenseId}/submit`);
      setExpenses((prev) => prev.map((e) => (e.id === expenseId ? { ...e, ...response.data } : e)));
    } catch (err: any) {
      setError('Failed to submit expense.');
    }
  };

  const handleBulkSubmit = async () => {
    setBulkSubmitting(true);
    try {
      const ids = Array.from(selectedIds);
      await api.post('/expenses/bulk-submit', { ids });
      setExpenses((prev) =>
        prev.map((e) => (ids.includes(e.id) ? { ...e, status: 'submitted' as const } : e))
      );
      setSelectedIds(new Set());
      setShowSubmitConfirm(false);
    } catch (err: any) {
      setError('Failed to submit selected expenses.');
    } finally {
      setBulkSubmitting(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === draftExpenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(draftExpenses.map((e) => e.id)));
    }
  };

  const columns = [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={draftExpenses.length > 0 && selectedIds.size === draftExpenses.length}
          onChange={toggleSelectAll}
          className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
        />
      ),
      render: (expense: Expense) =>
        expense.status === 'draft' ? (
          <input
            type="checkbox"
            checked={selectedIds.has(expense.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleSelect(expense.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
        ) : null,
    },
    {
      key: 'date',
      header: 'Date',
      render: (e: Expense) => <span className="text-slate-600 text-sm">{formatDate(e.date)}</span>,
    },
    {
      key: 'project',
      header: 'Project',
      render: (e: Expense) => (
        <div>
          <span className="text-sm text-slate-700">{e.projectName}</span>
          <span className="text-xs text-slate-400 ml-1">({e.projectCode})</span>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Category',
      render: (e: Expense) => <span className="text-slate-600">{e.category}</span>,
    },
    {
      key: 'description',
      header: 'Description',
      render: (e: Expense) => (
        <span className="text-slate-600 truncate block max-w-[200px]">{e.description}</span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      render: (e: Expense) => (
        <span className="font-medium text-slate-700">{formatCurrency(e.amount, e.currency)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e: Expense) => <StatusBadge status={e.status} />,
    },
    {
      key: 'actions',
      header: '',
      render: (e: Expense) => (
        <div className="flex items-center gap-1">
          {e.status === 'draft' && (
            <button
              onClick={(ev) => {
                ev.stopPropagation();
                handleSubmitSingle(e.id);
              }}
              className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition"
            >
              Submit
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
          <h1 className="text-2xl font-bold text-slate-800">Expenses</h1>
          <p className="text-slate-500 text-sm mt-1">
            Track and submit project expenses for reimbursement
          </p>
        </div>
        <div className="flex items-center gap-3">
          {selectedIds.size > 0 && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2.5 text-sm font-medium text-indigo-700 hover:bg-indigo-100 transition"
            >
              Submit Selected ({selectedIds.size})
            </button>
          )}
          <button
            onClick={handleAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Expense
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="paid">Paid</option>
        </select>
        <select value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
          ))}
        </select>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
          <option value="">All Categories</option>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={dateFromFilter}
            onChange={(e) => setDateFromFilter(e.target.value)}
            placeholder="From"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
          <span className="text-slate-400">to</span>
          <input
            type="date"
            value={dateToFilter}
            onChange={(e) => setDateToFilter(e.target.value)}
            placeholder="To"
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        {(statusFilter || projectFilter || categoryFilter || dateFromFilter || dateToFilter) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setProjectFilter('');
              setCategoryFilter('');
              setDateFromFilter('');
              setDateToFilter('');
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

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredExpenses}
        loading={loading}
        onRowClick={handleEdit}
        emptyMessage="No expenses found."
      />

      {/* Add/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Expense' : 'Add Expense'}>
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <FormField label="Project" required>
            <select value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="">Select project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>[{p.code}] {p.name}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Category" required>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="">Select category</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Date" required>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <FormField label="Description" required>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the expense" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Amount" required>
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })} min={0} step={0.01} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="Currency">
              <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Receipt Reference">
            <input type="text" value={form.receiptRef} onChange={(e) => setForm({ ...form, receiptRef: e.target.value })} placeholder="Receipt number or file reference" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2">
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editing ? 'Update Expense' : 'Create Expense'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Drawer */}
      {showDetail && selectedExpense && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowDetail(false)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-slate-800">Expense Detail</h2>
              <button onClick={() => setShowDetail(false)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Project</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedExpense.projectName}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Category</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedExpense.category}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Date</p>
                  <p className="text-sm text-slate-700 mt-1">{formatDate(selectedExpense.date)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Amount</p>
                  <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(selectedExpense.amount, selectedExpense.currency)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Status</p>
                  <div className="mt-1"><StatusBadge status={selectedExpense.status} /></div>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Receipt Ref</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedExpense.receiptRef || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Description</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedExpense.description}</p>
                </div>
              </div>

              {/* Approval History */}
              {selectedExpense.approvalHistory && selectedExpense.approvalHistory.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">Approval History</p>
                  <div className="space-y-2">
                    {selectedExpense.approvalHistory.map((entry) => (
                      <div key={entry.id} className="bg-slate-50 rounded-lg border border-slate-100 p-3">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                            entry.action === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                            entry.action === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                            {entry.action}
                          </span>
                          <span className="text-xs text-slate-400">{formatDate(entry.at)}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">By: {entry.by}</p>
                        {entry.notes && <p className="text-sm text-slate-500 mt-1">{entry.notes}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Submit Confirm */}
      <ConfirmDialog
        isOpen={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleBulkSubmit}
        title="Submit Expenses"
        message={`Are you sure you want to submit ${selectedIds.size} expense(s) for approval?`}
        confirmLabel={bulkSubmitting ? 'Submitting...' : 'Submit All'}
        variant="primary"
      />
    </div>
  );
};

export default ExpensesPage;
