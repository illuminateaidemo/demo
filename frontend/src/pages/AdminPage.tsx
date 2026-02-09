import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: 'active' | 'inactive';
  practice: string;
  office: string;
  lastLogin?: string;
  createdAt: string;
}

interface Practice {
  id: string;
  name: string;
  code: string;
  leadId: string;
  leadName: string;
  headcount: number;
  status: 'active' | 'inactive';
}

interface Office {
  id: string;
  name: string;
  code: string;
  city: string;
  country: string;
  headcount: number;
  status: 'active' | 'inactive';
}

interface SystemSettings {
  timesheetDeadlineDay: number;
  defaultCurrency: string;
  fiscalYearStart: number;
  approvalChainEnabled: boolean;
  maxExpenseWithoutApproval: number;
  defaultUtilisationTarget: number;
}

type TabId = 'users' | 'roles' | 'practices' | 'settings';

const TABS: { id: TabId; label: string }[] = [
  { id: 'users', label: 'Users' },
  { id: 'roles', label: 'Roles & Practices' },
  { id: 'practices', label: 'Offices' },
  { id: 'settings', label: 'System Settings' },
];

const ROLE_OPTIONS = [
  'admin',
  'partner',
  'director',
  'manager',
  'senior_consultant',
  'consultant',
  'analyst',
  'finance',
  'hr',
  'viewer',
];

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('users');

  // Users
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'consultant',
    practice: '',
    office: '',
  });
  const [savingUser, setSavingUser] = useState(false);
  const [userFormError, setUserFormError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Deactivate confirm
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<User | null>(null);

  // Practices
  const [practices, setPractices] = useState<Practice[]>([]);
  const [practicesLoading, setPracticesLoading] = useState(true);
  const [showPracticeModal, setShowPracticeModal] = useState(false);
  const [editingPractice, setEditingPractice] = useState<Practice | null>(null);
  const [practiceForm, setPracticeForm] = useState({ name: '', code: '', leadId: '', status: 'active' });
  const [savingPractice, setSavingPractice] = useState(false);

  // Offices
  const [offices, setOffices] = useState<Office[]>([]);
  const [officesLoading, setOfficesLoading] = useState(true);
  const [showOfficeModal, setShowOfficeModal] = useState(false);
  const [editingOffice, setEditingOffice] = useState<Office | null>(null);
  const [officeForm, setOfficeForm] = useState({ name: '', code: '', city: '', country: '', status: 'active' });
  const [savingOffice, setSavingOffice] = useState(false);

  // Settings
  const [settings, setSettings] = useState<SystemSettings>({
    timesheetDeadlineDay: 2,
    defaultCurrency: 'GBP',
    fiscalYearStart: 4,
    approvalChainEnabled: true,
    maxExpenseWithoutApproval: 50,
    defaultUtilisationTarget: 75,
  });
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setUsersLoading(true);
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load users.');
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchPractices = useCallback(async () => {
    setPracticesLoading(true);
    try {
      const response = await api.get('/admin/practices');
      setPractices(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load practices.');
    } finally {
      setPracticesLoading(false);
    }
  }, []);

  const fetchOffices = useCallback(async () => {
    setOfficesLoading(true);
    try {
      const response = await api.get('/admin/offices');
      setOffices(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load offices.');
    } finally {
      setOfficesLoading(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true);
    try {
      const response = await api.get('/admin/settings');
      setSettings(response.data);
    } catch (err: any) {
      setError('Failed to load settings.');
    } finally {
      setSettingsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'roles') fetchPractices();
    if (activeTab === 'practices') fetchOffices();
    if (activeTab === 'settings') fetchSettings();
  }, [activeTab, fetchUsers, fetchPractices, fetchOffices, fetchSettings]);

  const formatDate = (dateStr: string): string => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatRoleLabel = (role: string): string => {
    return role
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  // User CRUD
  const handleAddUser = () => {
    setEditingUser(null);
    setUserForm({ email: '', firstName: '', lastName: '', role: 'consultant', practice: '', office: '' });
    setUserFormError(null);
    setShowUserModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      practice: user.practice,
      office: user.office,
    });
    setUserFormError(null);
    setShowUserModal(true);
  };

  const handleSaveUser = async () => {
    if (!userForm.email.trim() || !userForm.firstName.trim() || !userForm.lastName.trim()) {
      setUserFormError('Email, first name, and last name are required.');
      return;
    }
    setSavingUser(true);
    setUserFormError(null);
    try {
      if (editingUser) {
        const response = await api.put(`/admin/users/${editingUser.id}`, userForm);
        setUsers((prev) => prev.map((u) => (u.id === editingUser.id ? { ...u, ...response.data } : u)));
      } else {
        const response = await api.post('/admin/users', userForm);
        setUsers((prev) => [response.data, ...prev]);
      }
      setShowUserModal(false);
    } catch (err: any) {
      setUserFormError(err.response?.data?.message || 'Failed to save user.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleDeactivateUser = async () => {
    if (!deactivatingUser) return;
    try {
      const newStatus = deactivatingUser.status === 'active' ? 'inactive' : 'active';
      await api.put(`/admin/users/${deactivatingUser.id}/status`, { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === deactivatingUser.id ? { ...u, status: newStatus } : u))
      );
    } catch (err: any) {
      setError('Failed to update user status.');
    } finally {
      setShowDeactivateConfirm(false);
      setDeactivatingUser(null);
    }
  };

  // Practice CRUD
  const handleSavePractice = async () => {
    setSavingPractice(true);
    try {
      if (editingPractice) {
        const response = await api.put(`/admin/practices/${editingPractice.id}`, practiceForm);
        setPractices((prev) => prev.map((p) => (p.id === editingPractice.id ? { ...p, ...response.data } : p)));
      } else {
        const response = await api.post('/admin/practices', practiceForm);
        setPractices((prev) => [...prev, response.data]);
      }
      setShowPracticeModal(false);
      setEditingPractice(null);
    } catch (err: any) {
      setError('Failed to save practice.');
    } finally {
      setSavingPractice(false);
    }
  };

  // Office CRUD
  const handleSaveOffice = async () => {
    setSavingOffice(true);
    try {
      if (editingOffice) {
        const response = await api.put(`/admin/offices/${editingOffice.id}`, officeForm);
        setOffices((prev) => prev.map((o) => (o.id === editingOffice.id ? { ...o, ...response.data } : o)));
      } else {
        const response = await api.post('/admin/offices', officeForm);
        setOffices((prev) => [...prev, response.data]);
      }
      setShowOfficeModal(false);
      setEditingOffice(null);
    } catch (err: any) {
      setError('Failed to save office.');
    } finally {
      setSavingOffice(false);
    }
  };

  // Settings save
  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSettingsSaved(false);
    try {
      await api.put('/admin/settings', settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    } catch (err: any) {
      setError('Failed to save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    if (!userSearchQuery) return true;
    const query = userSearchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(query) ||
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      u.role.toLowerCase().includes(query)
    );
  });

  const userColumns = [
    {
      key: 'name',
      header: 'Name',
      render: (u: User) => (
        <div>
          <p className="font-medium text-slate-800">{u.firstName} {u.lastName}</p>
          <p className="text-xs text-slate-400">{u.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      render: (u: User) => (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-700">
          {formatRoleLabel(u.role)}
        </span>
      ),
    },
    {
      key: 'practice',
      header: 'Practice',
      render: (u: User) => <span className="text-slate-600">{u.practice || '-'}</span>,
    },
    {
      key: 'office',
      header: 'Office',
      render: (u: User) => <span className="text-slate-600">{u.office || '-'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (u: User) => <StatusBadge status={u.status} />,
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      render: (u: User) => (
        <span className="text-slate-500 text-sm">{u.lastLogin ? formatDate(u.lastLogin) : 'Never'}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (u: User) => (
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleEditUser(u); }}
            className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeactivatingUser(u);
              setShowDeactivateConfirm(true);
            }}
            className={`p-1.5 rounded transition ${
              u.status === 'active'
                ? 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
            }`}
            title={u.status === 'active' ? 'Deactivate' : 'Activate'}
          >
            {u.status === 'active' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </button>
        </div>
      ),
    },
  ];

  const renderUsers = () => (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
          <input
            type="text"
            placeholder="Search users..."
            value={userSearchQuery}
            onChange={(e) => setUserSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
          />
        </div>
        <button
          onClick={handleAddUser}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add User
        </button>
      </div>
      <DataTable
        columns={userColumns}
        data={filteredUsers}
        loading={usersLoading}
        onRowClick={handleEditUser}
        emptyMessage="No users found."
      />
    </div>
  );

  const renderPracticesAndRoles = () => (
    <div className="space-y-6">
      {/* Practices */}
      <Card title="Practices">
        <div className="space-y-3 mb-4">
          {practicesLoading ? (
            <div className="flex justify-center py-8">
              <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : (
            <>
              {practices.map((practice) => (
                <div key={practice.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700">{practice.name}</p>
                      <span className="text-xs text-slate-400 font-mono">{practice.code}</span>
                      <StatusBadge status={practice.status} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Lead: {practice.leadName || '-'} &middot; {practice.headcount} members
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPractice(practice);
                      setPracticeForm({
                        name: practice.name,
                        code: practice.code,
                        leadId: practice.leadId,
                        status: practice.status,
                      });
                      setShowPracticeModal(true);
                    }}
                    className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </button>
                </div>
              ))}
              {practices.length === 0 && (
                <p className="text-sm text-slate-400 py-4 text-center">No practices configured</p>
              )}
            </>
          )}
        </div>
        <button
          onClick={() => {
            setEditingPractice(null);
            setPracticeForm({ name: '', code: '', leadId: '', status: 'active' });
            setShowPracticeModal(true);
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Practice
        </button>
      </Card>

      {/* Available Roles */}
      <Card title="System Roles">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ROLE_OPTIONS.map((role) => (
            <div key={role} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                {role.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-700">{formatRoleLabel(role)}</p>
                <p className="text-xs text-slate-400">
                  {users.filter((u) => u.role === role).length} user(s)
                </p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderOffices = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-800">Office Locations</h3>
        <button
          onClick={() => {
            setEditingOffice(null);
            setOfficeForm({ name: '', code: '', city: '', country: '', status: 'active' });
            setShowOfficeModal(true);
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Office
        </button>
      </div>

      {officesLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {offices.map((office) => (
            <div key={office.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{office.name}</p>
                    <span className="text-xs text-slate-400 font-mono">{office.code}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {office.city}, {office.country}
                  </p>
                </div>
                <StatusBadge status={office.status} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{office.headcount} staff</span>
                <button
                  onClick={() => {
                    setEditingOffice(office);
                    setOfficeForm({
                      name: office.name,
                      code: office.code,
                      city: office.city,
                      country: office.country,
                      status: office.status,
                    });
                    setShowOfficeModal(true);
                  }}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-500 transition"
                >
                  Edit
                </button>
              </div>
            </div>
          ))}
          {offices.length === 0 && (
            <p className="text-sm text-slate-400 py-8 text-center col-span-full">No offices configured</p>
          )}
        </div>
      )}
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6 max-w-2xl">
      {settingsLoading ? (
        <div className="flex justify-center py-12">
          <svg className="animate-spin h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : (
        <>
          <Card title="Timesheet Settings">
            <div className="space-y-4">
              <FormField label="Submission Deadline (Day of Week)">
                <select
                  value={settings.timesheetDeadlineDay}
                  onChange={(e) => setSettings({ ...settings, timesheetDeadlineDay: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                </select>
              </FormField>
              <FormField label="Default Utilisation Target (%)">
                <input
                  type="number"
                  value={settings.defaultUtilisationTarget}
                  onChange={(e) => setSettings({ ...settings, defaultUtilisationTarget: parseInt(e.target.value) || 0 })}
                  min={0}
                  max={100}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </FormField>
            </div>
          </Card>

          <Card title="Financial Settings">
            <div className="space-y-4">
              <FormField label="Default Currency">
                <select
                  value={settings.defaultCurrency}
                  onChange={(e) => setSettings({ ...settings, defaultCurrency: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  <option value="GBP">GBP - British Pound</option>
                  <option value="USD">USD - US Dollar</option>
                  <option value="EUR">EUR - Euro</option>
                </select>
              </FormField>
              <FormField label="Fiscal Year Start Month">
                <select
                  value={settings.fiscalYearStart}
                  onChange={(e) => setSettings({ ...settings, fiscalYearStart: parseInt(e.target.value) })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                >
                  {['January','February','March','April','May','June','July','August','September','October','November','December'].map((month, i) => (
                    <option key={i + 1} value={i + 1}>{month}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Max Expense Without Approval">
                <input
                  type="number"
                  value={settings.maxExpenseWithoutApproval}
                  onChange={(e) => setSettings({ ...settings, maxExpenseWithoutApproval: parseFloat(e.target.value) || 0 })}
                  min={0}
                  step={10}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                />
              </FormField>
            </div>
          </Card>

          <Card title="Approval Settings">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-700">Approval Chain</p>
                  <p className="text-xs text-slate-400 mt-0.5">Require hierarchical approval for submissions</p>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, approvalChainEnabled: !settings.approvalChainEnabled })}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    settings.approvalChainEnabled ? 'bg-indigo-600' : 'bg-slate-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      settings.approvalChainEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </Card>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2"
            >
              {savingSettings && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              Save Settings
            </button>
            {settingsSaved && (
              <span className="text-sm text-emerald-600 font-medium flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
                Settings saved successfully
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Administration</h1>
        <p className="text-slate-500 text-sm mt-1">
          Manage users, roles, and system configuration
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
      {activeTab === 'users' && renderUsers()}
      {activeTab === 'roles' && renderPracticesAndRoles()}
      {activeTab === 'practices' && renderOffices()}
      {activeTab === 'settings' && renderSettings()}

      {/* User Modal */}
      <Modal isOpen={showUserModal} onClose={() => setShowUserModal(false)} title={editingUser ? 'Edit User' : 'Add User'}>
        <div className="space-y-4">
          {userFormError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">{userFormError}</div>
          )}
          <FormField label="Email" required>
            <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} placeholder="user@company.com" disabled={!!editingUser} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:opacity-60 disabled:bg-slate-50" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" required>
              <input type="text" value={userForm.firstName} onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })} placeholder="First name" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="Last Name" required>
              <input type="text" value={userForm.lastName} onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })} placeholder="Last name" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <FormField label="Role">
            <select value={userForm.role} onChange={(e) => setUserForm({ ...userForm, role: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              {ROLE_OPTIONS.map((role) => (
                <option key={role} value={role}>{formatRoleLabel(role)}</option>
              ))}
            </select>
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Practice">
              <select value={userForm.practice} onChange={(e) => setUserForm({ ...userForm, practice: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="">Select practice</option>
                {practices.map((p) => (
                  <option key={p.id} value={p.name}>{p.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Office">
              <select value={userForm.office} onChange={(e) => setUserForm({ ...userForm, office: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
                <option value="">Select office</option>
                {offices.map((o) => (
                  <option key={o.id} value={o.name}>{o.name}</option>
                ))}
              </select>
            </FormField>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowUserModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSaveUser} disabled={savingUser} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 flex items-center gap-2">
              {savingUser && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editingUser ? 'Update User' : 'Create User'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Practice Modal */}
      <Modal isOpen={showPracticeModal} onClose={() => setShowPracticeModal(false)} title={editingPractice ? 'Edit Practice' : 'Add Practice'}>
        <div className="space-y-4">
          <FormField label="Practice Name" required>
            <input type="text" value={practiceForm.name} onChange={(e) => setPracticeForm({ ...practiceForm, name: e.target.value })} placeholder="e.g. Technology" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <FormField label="Code">
            <input type="text" value={practiceForm.code} onChange={(e) => setPracticeForm({ ...practiceForm, code: e.target.value.toUpperCase() })} placeholder="e.g. TECH" maxLength={6} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 font-mono placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <FormField label="Practice Lead">
            <select value={practiceForm.leadId} onChange={(e) => setPracticeForm({ ...practiceForm, leadId: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="">Select lead</option>
              {users.filter((u) => u.status === 'active').map((u) => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select value={practiceForm.status} onChange={(e) => setPracticeForm({ ...practiceForm, status: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowPracticeModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSavePractice} disabled={savingPractice} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {editingPractice ? 'Update Practice' : 'Add Practice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Office Modal */}
      <Modal isOpen={showOfficeModal} onClose={() => setShowOfficeModal(false)} title={editingOffice ? 'Edit Office' : 'Add Office'}>
        <div className="space-y-4">
          <FormField label="Office Name" required>
            <input type="text" value={officeForm.name} onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })} placeholder="e.g. London HQ" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <FormField label="Code">
            <input type="text" value={officeForm.code} onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value.toUpperCase() })} placeholder="e.g. LON" maxLength={4} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 font-mono placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
          </FormField>
          <div className="grid grid-cols-2 gap-3">
            <FormField label="City">
              <input type="text" value={officeForm.city} onChange={(e) => setOfficeForm({ ...officeForm, city: e.target.value })} placeholder="London" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
            <FormField label="Country">
              <input type="text" value={officeForm.country} onChange={(e) => setOfficeForm({ ...officeForm, country: e.target.value })} placeholder="United Kingdom" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none" />
            </FormField>
          </div>
          <FormField label="Status">
            <select value={officeForm.status} onChange={(e) => setOfficeForm({ ...officeForm, status: e.target.value })} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button onClick={() => setShowOfficeModal(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition">Cancel</button>
            <button onClick={handleSaveOffice} disabled={savingOffice} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60">
              {editingOffice ? 'Update Office' : 'Add Office'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Deactivate Confirm */}
      <ConfirmDialog
        isOpen={showDeactivateConfirm}
        onClose={() => { setShowDeactivateConfirm(false); setDeactivatingUser(null); }}
        onConfirm={handleDeactivateUser}
        title={deactivatingUser?.status === 'active' ? 'Deactivate User' : 'Activate User'}
        message={`Are you sure you want to ${deactivatingUser?.status === 'active' ? 'deactivate' : 'activate'} ${deactivatingUser?.firstName} ${deactivatingUser?.lastName}?${deactivatingUser?.status === 'active' ? ' They will no longer be able to log in.' : ''}`}
        confirmLabel={deactivatingUser?.status === 'active' ? 'Deactivate' : 'Activate'}
        variant={deactivatingUser?.status === 'active' ? 'danger' : 'primary'}
      />
    </div>
  );
};

export default AdminPage;
