import React, { useState, useEffect, useCallback, useContext } from 'react';
import api from '../services/api';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import { AuthContext } from '../store/AuthContext';

interface TimesheetEntry {
  id?: string;
  projectId: string;
  projectName: string;
  projectCode: string;
  activityType: string;
  hours: { [day: string]: number };
  notes: { [day: string]: string };
}

interface TimesheetData {
  id: string;
  weekStarting: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  entries: TimesheetEntry[];
  submittedAt?: string;
  approvedAt?: string;
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

interface PastTimesheet {
  id: string;
  weekStarting: string;
  totalHours: number;
  status: string;
  submittedAt?: string;
}

const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const ACTIVITY_TYPES = ['Delivery', 'Meetings', 'Admin', 'Training', 'Travel', 'Pre-Sales', 'Internal'];

const TimesheetsPage: React.FC = () => {
  const { user } = useContext(AuthContext);

  const [weekStart, setWeekStart] = useState<Date>(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(now.setDate(diff));
  });

  const [timesheet, setTimesheet] = useState<TimesheetData | null>(null);
  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [pastTimesheets, setPastTimesheets] = useState<PastTimesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<{ entryIndex: number; day: string } | null>(null);
  const [noteValue, setNoteValue] = useState('');

  const getWeekStartString = useCallback((date: Date): string => {
    return date.toISOString().split('T')[0];
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const weekStr = getWeekStartString(weekStart);
      const [tsRes, projRes, histRes] = await Promise.all([
        api.get(`/timesheets/week/${weekStr}`),
        api.get('/projects', { params: { status: 'active' } }),
        api.get('/timesheets/history'),
      ]);
      const tsData = tsRes.data;
      setTimesheet(tsData);
      setEntries(tsData?.entries || []);
      setProjects((projRes.data.items || projRes.data).map((p: any) => ({ id: p.id, name: p.name, code: p.code })));
      setPastTimesheets(histRes.data.items || histRes.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setTimesheet(null);
        setEntries([]);
      } else {
        setError('Failed to load timesheet data.');
      }
    } finally {
      setLoading(false);
    }
  }, [weekStart, getWeekStartString]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const navigateWeek = (direction: number) => {
    setWeekStart((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + direction * 7);
      return newDate;
    });
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getWeekDates = (): string[] => {
    return DAYS.map((_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    });
  };

  const weekDates = getWeekDates();

  const updateHours = (entryIndex: number, day: string, value: string) => {
    const hours = parseFloat(value) || 0;
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== entryIndex) return entry;
        return { ...entry, hours: { ...entry.hours, [day]: hours } };
      })
    );
  };

  const getEntryDayTotal = (entry: TimesheetEntry): number => {
    return DAYS.reduce((sum, day) => sum + (entry.hours[day] || 0), 0);
  };

  const getDayTotal = (day: string): number => {
    return entries.reduce((sum, entry) => sum + (entry.hours[day] || 0), 0);
  };

  const getWeekTotal = (): number => {
    return entries.reduce((sum, entry) => sum + getEntryDayTotal(entry), 0);
  };

  const addProjectRow = () => {
    setEntries((prev) => [
      ...prev,
      {
        projectId: '',
        projectName: '',
        projectCode: '',
        activityType: 'Delivery',
        hours: {},
        notes: {},
      },
    ]);
  };

  const removeProjectRow = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const updateEntryProject = (index: number, projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        return {
          ...entry,
          projectId,
          projectName: project?.name || '',
          projectCode: project?.code || '',
        };
      })
    );
  };

  const updateEntryActivity = (index: number, activityType: string) => {
    setEntries((prev) =>
      prev.map((entry, i) => {
        if (i !== index) return entry;
        return { ...entry, activityType };
      })
    );
  };

  const validate = (): string[] => {
    const errors: string[] = [];
    DAYS.forEach((day, i) => {
      const total = getDayTotal(day);
      if (total > 24) {
        errors.push(`${DAY_LABELS[i]}: Total exceeds 24 hours (${total}h)`);
      }
    });
    entries.forEach((entry, i) => {
      if (!entry.projectId && getEntryDayTotal(entry) > 0) {
        errors.push(`Row ${i + 1}: Project must be selected when hours are logged`);
      }
    });
    return errors;
  };

  const handleSaveDraft = async () => {
    const errors = validate();
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSaving(true);
    try {
      const payload = {
        weekStarting: getWeekStartString(weekStart),
        entries: entries.filter((e) => e.projectId),
      };
      if (timesheet?.id) {
        const response = await api.put(`/timesheets/${timesheet.id}`, payload);
        setTimesheet(response.data);
      } else {
        const response = await api.post('/timesheets', payload);
        setTimesheet(response.data);
      }
      setError(null);
    } catch (err: any) {
      setError('Failed to save timesheet.');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const errors = validate();
    if (getWeekTotal() === 0) {
      errors.push('Cannot submit an empty timesheet.');
    }
    setValidationErrors(errors);
    if (errors.length > 0) return;

    setSubmitting(true);
    try {
      const payload = {
        weekStarting: getWeekStartString(weekStart),
        entries: entries.filter((e) => e.projectId),
      };
      let tsId = timesheet?.id;
      if (!tsId) {
        const createRes = await api.post('/timesheets', payload);
        tsId = createRes.data.id;
      } else {
        await api.put(`/timesheets/${tsId}`, payload);
      }
      const response = await api.post(`/timesheets/${tsId}/submit`);
      setTimesheet(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit timesheet.');
    } finally {
      setSubmitting(false);
    }
  };

  const openNotes = (entryIndex: number, day: string) => {
    setEditingNotes({ entryIndex, day });
    setNoteValue(entries[entryIndex]?.notes?.[day] || '');
  };

  const saveNotes = () => {
    if (editingNotes) {
      setEntries((prev) =>
        prev.map((entry, i) => {
          if (i !== editingNotes.entryIndex) return entry;
          return { ...entry, notes: { ...entry.notes, [editingNotes.day]: noteValue } };
        })
      );
    }
    setEditingNotes(null);
  };

  const isEditable = !timesheet || timesheet.status === 'draft' || timesheet.status === 'rejected';

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <p className="text-slate-500 text-sm">Loading timesheet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Timesheets</h1>
          <p className="text-slate-500 text-sm mt-1">
            Log your weekly hours against projects
          </p>
        </div>
      </div>

      {/* Week Selector */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-slate-200 p-4">
        <button
          onClick={() => navigateWeek(-1)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-800">
            Week of {formatDate(getWeekStartString(weekStart))}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            {timesheet && (
              <StatusBadge status={timesheet.status} />
            )}
            {!timesheet && (
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                New
              </span>
            )}
          </div>
        </div>
        <button
          onClick={() => navigateWeek(1)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      </div>

      {/* Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm font-medium text-red-700 mb-1">Please fix the following issues:</p>
          <ul className="list-disc list-inside text-sm text-red-600 space-y-0.5">
            {validationErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Timesheet Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-48">
                Project
              </th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-28">
                Activity
              </th>
              {DAYS.map((day, i) => (
                <th key={day} className="text-center px-2 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-20">
                  <div>{DAY_LABELS[i]}</div>
                  <div className="text-[10px] font-normal text-slate-400 mt-0.5">{weekDates[i]}</div>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">
                Total
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, entryIndex) => (
              <tr key={entryIndex} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2">
                  {isEditable ? (
                    <select
                      value={entry.projectId}
                      onChange={(e) => updateEntryProject(entryIndex, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                    >
                      <option value="">Select project</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.code}] {p.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-700">
                      [{entry.projectCode}] {entry.projectName}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  {isEditable ? (
                    <select
                      value={entry.activityType}
                      onChange={(e) => updateEntryActivity(entryIndex, e.target.value)}
                      className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none"
                    >
                      {ACTIVITY_TYPES.map((a) => (
                        <option key={a} value={a}>{a}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-sm text-slate-600">{entry.activityType}</span>
                  )}
                </td>
                {DAYS.map((day) => (
                  <td key={day} className="px-1 py-2 text-center">
                    {isEditable ? (
                      <div className="relative group">
                        <input
                          type="number"
                          value={entry.hours[day] || ''}
                          onChange={(e) => updateHours(entryIndex, day, e.target.value)}
                          min={0}
                          max={24}
                          step={0.5}
                          placeholder="-"
                          className="w-full text-center rounded border border-slate-200 bg-white px-1 py-1.5 text-sm text-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 focus:outline-none placeholder-slate-300"
                        />
                        <button
                          onClick={() => openNotes(entryIndex, day)}
                          className={`absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full text-[8px] flex items-center justify-center transition opacity-0 group-hover:opacity-100 ${
                            entry.notes?.[day]
                              ? 'bg-indigo-500 text-white opacity-100'
                              : 'bg-slate-300 text-white'
                          }`}
                          title="Add note"
                        >
                          N
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-600">{entry.hours[day] || '-'}</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-center">
                  <span className="text-sm font-semibold text-slate-700">
                    {getEntryDayTotal(entry) || '-'}
                  </span>
                </td>
                <td className="px-2 py-2">
                  {isEditable && (
                    <button
                      onClick={() => removeProjectRow(entryIndex)}
                      className="p-1 rounded text-slate-300 hover:text-red-500 transition"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </td>
              </tr>
            ))}

            {/* Day Totals */}
            <tr className="bg-slate-50 border-t border-slate-200">
              <td className="px-3 py-3 text-sm font-semibold text-slate-700" colSpan={2}>
                Daily Total
              </td>
              {DAYS.map((day) => {
                const total = getDayTotal(day);
                const isOver = total > 24;
                return (
                  <td key={day} className="px-1 py-3 text-center">
                    <span className={`text-sm font-bold ${isOver ? 'text-red-600' : 'text-slate-700'}`}>
                      {total || '-'}
                    </span>
                  </td>
                );
              })}
              <td className="px-3 py-3 text-center">
                <span className="text-sm font-bold text-indigo-600">{getWeekTotal()}</span>
              </td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>

      {/* Add Row & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {isEditable && (
          <button
            onClick={addProjectRow}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Project Row
          </button>
        )}

        {isEditable && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveDraft}
              disabled={saving}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition disabled:opacity-60 flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Save Draft
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2"
            >
              {submitting && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Submit for Approval
            </button>
          </div>
        )}
      </div>

      {/* Past Timesheets */}
      <Card title="Timesheet History">
        {pastTimesheets.length === 0 ? (
          <p className="text-sm text-slate-400 py-4 text-center">No past timesheets</p>
        ) : (
          <div className="space-y-2">
            {pastTimesheets.map((ts) => (
              <div
                key={ts.id}
                onClick={() => {
                  setWeekStart(new Date(ts.weekStarting));
                }}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Week of {formatDate(ts.weekStarting)}
                  </p>
                  {ts.submittedAt && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      Submitted {formatDate(ts.submittedAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-700">{ts.totalHours}h</span>
                  <StatusBadge status={ts.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Notes Modal */}
      {editingNotes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setEditingNotes(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              Notes - {DAY_LABELS[DAYS.indexOf(editingNotes.day)]}
            </h3>
            <textarea
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value)}
              placeholder="Add notes for this entry..."
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
              autoFocus
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setEditingNotes(null)}
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveNotes}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimesheetsPage;
