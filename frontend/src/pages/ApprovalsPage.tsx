import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';

interface ApprovalItem {
  id: string;
  type: 'timesheet' | 'expense' | 'resource_request' | 'project_change';
  typeLabel: string;
  requestorId: string;
  requestorName: string;
  description: string;
  details: string;
  amount?: number;
  currency?: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  projectName?: string;
  projectCode?: string;
}

interface CompletedApproval extends ApprovalItem {
  decidedAt: string;
  decisionNotes?: string;
}

type TabId = 'pending' | 'completed';

const ApprovalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('pending');
  const [pendingItems, setPendingItems] = useState<ApprovalItem[]>([]);
  const [completedItems, setCompletedItems] = useState<CompletedApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [actionItem, setActionItem] = useState<{ item: ApprovalItem; action: 'approve' | 'reject' } | null>(null);
  const [actionNotes, setActionNotes] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [pendingRes, completedRes] = await Promise.all([
        api.get('/approvals/pending'),
        api.get('/approvals/completed'),
      ]);
      setPendingItems(pendingRes.data.items || pendingRes.data);
      setCompletedItems(completedRes.data.items || completedRes.data);
    } catch (err: any) {
      setError('Failed to load approvals.');
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

  const formatDateTime = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleQuickApprove = async (item: ApprovalItem) => {
    setActionLoading(item.id);
    try {
      await api.post(`/approvals/${item.id}/approve`, { notes: '' });
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
      fetchData();
    } catch (err: any) {
      setError('Failed to approve item.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleActionWithNotes = (item: ApprovalItem, action: 'approve' | 'reject') => {
    setActionItem({ item, action });
    setActionNotes('');
    setShowNotesModal(true);
  };

  const handleSubmitAction = async () => {
    if (!actionItem) return;
    const { item, action } = actionItem;

    if (action === 'reject' && !actionNotes.trim()) {
      return;
    }

    setActionLoading(item.id);
    try {
      await api.post(`/approvals/${item.id}/${action}`, { notes: actionNotes });
      setPendingItems((prev) => prev.filter((i) => i.id !== item.id));
      setShowNotesModal(false);
      setActionItem(null);
      fetchData();
    } catch (err: any) {
      setError(`Failed to ${action} item.`);
    } finally {
      setActionLoading(null);
    }
  };

  const getTypeIcon = (type: string): React.ReactNode => {
    const cls = 'w-5 h-5';
    switch (type) {
      case 'timesheet':
        return (
          <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'expense':
        return (
          <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
          </svg>
        );
      case 'resource_request':
        return (
          <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
          </svg>
        );
      default:
        return (
          <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
          </svg>
        );
    }
  };

  const getTypeColor = (type: string): string => {
    switch (type) {
      case 'timesheet': return 'bg-blue-100 text-blue-600';
      case 'expense': return 'bg-emerald-100 text-emerald-600';
      case 'resource_request': return 'bg-purple-100 text-purple-600';
      case 'project_change': return 'bg-amber-100 text-amber-600';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  // Group pending items by type
  const groupedPending = pendingItems.reduce<Record<string, ApprovalItem[]>>((acc, item) => {
    const key = item.typeLabel || item.type;
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});

  const pendingCount = pendingItems.length;
  const completedCount = completedItems.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-500 text-sm">Loading approvals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Approvals</h1>
        <p className="text-slate-500 text-sm mt-1">
          Review and manage pending approval requests
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-6 -mb-px">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'pending'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Pending
            {pendingCount > 0 && (
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                activeTab === 'pending' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`py-3 text-sm font-medium border-b-2 transition flex items-center gap-2 ${
              activeTab === 'completed'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Completed
            {completedCount > 0 && (
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold ${
                activeTab === 'completed' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-600'
              }`}>
                {completedCount}
              </span>
            )}
          </button>
        </nav>
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <div className="space-y-6">
          {pendingItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100 mb-4">
                <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-700 font-medium">All caught up!</p>
              <p className="text-slate-400 text-sm mt-1">No pending approvals at this time.</p>
            </div>
          ) : (
            Object.entries(groupedPending).map(([type, items]) => (
              <div key={type}>
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  {type} ({items.length})
                </h3>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(item.type)}`}>
                          {getTypeIcon(item.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-slate-800">{item.description}</p>
                              <p className="text-xs text-slate-500 mt-0.5">
                                Requested by {item.requestorName} &middot; {formatDate(item.createdAt)}
                              </p>
                              {item.projectName && (
                                <p className="text-xs text-slate-400 mt-0.5">
                                  Project: {item.projectName} ({item.projectCode})
                                </p>
                              )}
                              {item.details && (
                                <p className="text-sm text-slate-600 mt-2">{item.details}</p>
                              )}
                              {item.amount !== undefined && item.amount > 0 && (
                                <p className="text-sm font-semibold text-slate-700 mt-1">
                                  {formatCurrency(item.amount, item.currency)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <button
                                onClick={() => handleActionWithNotes(item, 'reject')}
                                disabled={actionLoading === item.id}
                                className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition disabled:opacity-60"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => handleQuickApprove(item)}
                                disabled={actionLoading === item.id}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500 transition disabled:opacity-60 flex items-center gap-1"
                              >
                                {actionLoading === item.id ? (
                                  <svg className="animate-spin h-3.5 w-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                  </svg>
                                )}
                                Approve
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Completed Tab */}
      {activeTab === 'completed' && (
        <div className="space-y-3">
          {completedItems.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200">
              <p className="text-slate-400">No completed approvals yet.</p>
            </div>
          ) : (
            completedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 p-4"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${getTypeColor(item.type)}`}>
                    {getTypeIcon(item.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{item.description}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Requested by {item.requestorName} &middot; {formatDate(item.createdAt)}
                        </p>
                        {item.details && (
                          <p className="text-sm text-slate-500 mt-1">{item.details}</p>
                        )}
                        {item.decisionNotes && (
                          <div className="mt-2 bg-slate-50 rounded-lg px-3 py-2">
                            <p className="text-xs text-slate-400 mb-0.5">Notes:</p>
                            <p className="text-sm text-slate-600">{item.decisionNotes}</p>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <StatusBadge status={item.status} />
                        <span className="text-xs text-slate-400">{formatDateTime(item.decidedAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Notes Modal */}
      {showNotesModal && actionItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowNotesModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              {actionItem.action === 'approve' ? 'Approve' : 'Reject'} Request
            </h3>
            <p className="text-sm text-slate-500 mb-4">{actionItem.item.description}</p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Notes {actionItem.action === 'reject' && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  placeholder={
                    actionItem.action === 'reject'
                      ? 'Please provide a reason for rejection...'
                      : 'Optional notes...'
                  }
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
                  autoFocus
                />
                {actionItem.action === 'reject' && !actionNotes.trim() && (
                  <p className="text-xs text-red-500 mt-1">Rejection reason is required</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNotesModal(false)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAction}
                disabled={actionItem.action === 'reject' && !actionNotes.trim()}
                className={`rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  actionItem.action === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-500'
                    : 'bg-red-600 hover:bg-red-500'
                }`}
              >
                {actionItem.action === 'approve' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalsPage;
