import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Card from '../components/common/Card';
import StatusBadge from '../components/common/StatusBadge';
import FormField from '../components/common/FormField';
import ConfirmDialog from '../components/common/ConfirmDialog';

interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isPrimary: boolean;
}

interface Client {
  id: string;
  name: string;
  industry: string;
  status: 'active' | 'inactive' | 'prospect';
  website: string;
  address: string;
  notes: string;
  contacts: Contact[];
  projectCount: number;
  createdAt: string;
}

const INDUSTRY_OPTIONS = [
  'Financial Services',
  'Healthcare',
  'Technology',
  'Manufacturing',
  'Retail',
  'Energy',
  'Government',
  'Education',
  'Telecommunications',
  'Other',
];

const STATUS_OPTIONS: { value: Client['status']; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospect', label: 'Prospect' },
];

const emptyClient: Omit<Client, 'id' | 'contacts' | 'projectCount' | 'createdAt'> = {
  name: '',
  industry: '',
  status: 'prospect',
  website: '',
  address: '',
  notes: '',
};

const emptyContact: Omit<Contact, 'id'> = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  role: '',
  isPrimary: false,
};

const ClientsPage: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  // Client modal
  const [showClientModal, setShowClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientForm, setClientForm] = useState(emptyClient);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Detail view
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Contact modal
  const [showContactModal, setShowContactModal] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactForm, setContactForm] = useState(emptyContact);
  const [savingContact, setSavingContact] = useState(false);

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingContactId, setDeletingContactId] = useState<string | null>(null);

  const fetchClients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (searchQuery) params.search = searchQuery;
      const response = await api.get('/clients', { params });
      setClients(response.data.items || response.data);
    } catch (err: any) {
      setError('Failed to load clients. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleAddClient = () => {
    setEditingClient(null);
    setClientForm(emptyClient);
    setFormError(null);
    setShowClientModal(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setClientForm({
      name: client.name,
      industry: client.industry,
      status: client.status,
      website: client.website,
      address: client.address,
      notes: client.notes,
    });
    setFormError(null);
    setShowClientModal(true);
  };

  const handleSaveClient = async () => {
    if (!clientForm.name.trim()) {
      setFormError('Client name is required.');
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      if (editingClient) {
        const response = await api.put(`/clients/${editingClient.id}`, clientForm);
        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? { ...c, ...response.data } : c))
        );
        if (selectedClient?.id === editingClient.id) {
          setSelectedClient({ ...selectedClient, ...response.data });
        }
      } else {
        const response = await api.post('/clients', clientForm);
        setClients((prev) => [response.data, ...prev]);
      }
      setShowClientModal(false);
    } catch (err: any) {
      setFormError(err.response?.data?.message || 'Failed to save client.');
    } finally {
      setSaving(false);
    }
  };

  const handleViewClient = (client: Client) => {
    setSelectedClient(client);
    setShowDetail(true);
  };

  // Contact CRUD
  const handleAddContact = () => {
    setEditingContact(null);
    setContactForm(emptyContact);
    setShowContactModal(true);
  };

  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setContactForm({
      firstName: contact.firstName,
      lastName: contact.lastName,
      email: contact.email,
      phone: contact.phone,
      role: contact.role,
      isPrimary: contact.isPrimary,
    });
    setShowContactModal(true);
  };

  const handleSaveContact = async () => {
    if (!contactForm.firstName.trim() || !contactForm.lastName.trim()) {
      return;
    }
    if (!selectedClient) return;

    setSavingContact(true);
    try {
      if (editingContact) {
        const response = await api.put(
          `/clients/${selectedClient.id}/contacts/${editingContact.id}`,
          contactForm
        );
        const updatedContacts = selectedClient.contacts.map((c) =>
          c.id === editingContact.id ? response.data : c
        );
        const updated = { ...selectedClient, contacts: updatedContacts };
        setSelectedClient(updated);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const response = await api.post(`/clients/${selectedClient.id}/contacts`, contactForm);
        const updated = {
          ...selectedClient,
          contacts: [...selectedClient.contacts, response.data],
        };
        setSelectedClient(updated);
        setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      }
      setShowContactModal(false);
    } catch (err: any) {
      // handle error
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!selectedClient || !deletingContactId) return;
    try {
      await api.delete(`/clients/${selectedClient.id}/contacts/${deletingContactId}`);
      const updated = {
        ...selectedClient,
        contacts: selectedClient.contacts.filter((c) => c.id !== deletingContactId),
      };
      setSelectedClient(updated);
      setClients((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    } catch (err: any) {
      // handle error
    } finally {
      setShowDeleteConfirm(false);
      setDeletingContactId(null);
    }
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const filteredClients = clients.filter((client) => {
    const matchesSearch =
      !searchQuery ||
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.industry.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = !statusFilter || client.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (client: Client) => (
        <span className="font-medium text-slate-800">{client.name}</span>
      ),
    },
    { key: 'industry', header: 'Industry' },
    {
      key: 'status',
      header: 'Status',
      render: (client: Client) => <StatusBadge status={client.status} />,
    },
    {
      key: 'contacts',
      header: 'Contacts',
      render: (client: Client) => (
        <span className="text-slate-600">{client.contacts?.length || 0}</span>
      ),
    },
    {
      key: 'projectCount',
      header: 'Projects',
      render: (client: Client) => (
        <span className="text-slate-600">{client.projectCount}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (client: Client) => (
        <span className="text-slate-500 text-sm">{formatDate(client.createdAt)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Clients</h1>
          <p className="text-slate-500 text-sm mt-1">
            Manage your client portfolio and contacts
          </p>
        </div>
        <button
          onClick={handleAddClient}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          Add Client
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
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
            placeholder="Search clients..."
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
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
          <button onClick={fetchClients} className="ml-2 underline">
            Retry
          </button>
        </div>
      )}

      {/* Table */}
      <DataTable
        columns={columns}
        data={filteredClients}
        loading={loading}
        onRowClick={handleViewClient}
        emptyMessage="No clients found. Create your first client to get started."
      />

      {/* Client Detail Drawer */}
      {showDetail && selectedClient && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowDetail(false)}
          />
          <div className="relative w-full max-w-xl bg-white shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">
                  {selectedClient.name}
                </h2>
                <StatusBadge status={selectedClient.status} />
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleEditClient(selectedClient)}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setShowDetail(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Industry</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedClient.industry || '-'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Website</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {selectedClient.website ? (
                      <a
                        href={selectedClient.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline"
                      >
                        {selectedClient.website}
                      </a>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Address</p>
                  <p className="text-sm text-slate-700 mt-1">{selectedClient.address || '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Notes</p>
                  <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">
                    {selectedClient.notes || '-'}
                  </p>
                </div>
              </div>

              {/* Contacts */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-slate-800">
                    Contacts ({selectedClient.contacts?.length || 0})
                  </h3>
                  <button
                    onClick={handleAddContact}
                    className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    Add Contact
                  </button>
                </div>

                {(!selectedClient.contacts || selectedClient.contacts.length === 0) ? (
                  <p className="text-sm text-slate-400 py-4 text-center border border-dashed border-slate-200 rounded-lg">
                    No contacts yet
                  </p>
                ) : (
                  <div className="space-y-2">
                    {selectedClient.contacts.map((contact) => (
                      <div
                        key={contact.id}
                        className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-700">
                              {contact.firstName} {contact.lastName}
                            </p>
                            {contact.isPrimary && (
                              <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {contact.role}
                            {contact.email && ` | ${contact.email}`}
                            {contact.phone && ` | ${contact.phone}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleEditContact(contact)}
                            className="p-1.5 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                            </svg>
                          </button>
                          <button
                            onClick={() => {
                              setDeletingContactId(contact.id);
                              setShowDeleteConfirm(true);
                            }}
                            className="p-1.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                            </svg>
                          </button>
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

      {/* Add/Edit Client Modal */}
      <Modal
        isOpen={showClientModal}
        onClose={() => setShowClientModal(false)}
        title={editingClient ? 'Edit Client' : 'Add Client'}
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-2.5 text-sm text-red-700">
              {formError}
            </div>
          )}
          <FormField label="Client Name" required>
            <input
              type="text"
              value={clientForm.name}
              onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
              placeholder="Enter client name"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <FormField label="Industry">
            <select
              value={clientForm.industry}
              onChange={(e) => setClientForm({ ...clientForm, industry: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              <option value="">Select industry</option>
              {INDUSTRY_OPTIONS.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Status">
            <select
              value={clientForm.status}
              onChange={(e) =>
                setClientForm({ ...clientForm, status: e.target.value as Client['status'] })
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Website">
            <input
              type="url"
              value={clientForm.website}
              onChange={(e) => setClientForm({ ...clientForm, website: e.target.value })}
              placeholder="https://example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <FormField label="Address">
            <textarea
              value={clientForm.address}
              onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
              placeholder="Enter address"
              rows={2}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            />
          </FormField>
          <FormField label="Notes">
            <textarea
              value={clientForm.notes}
              onChange={(e) => setClientForm({ ...clientForm, notes: e.target.value })}
              placeholder="Additional notes"
              rows={3}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none resize-none"
            />
          </FormField>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowClientModal(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveClient}
              disabled={saving}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving && (
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {editingClient ? 'Update Client' : 'Create Client'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Contact Modal */}
      <Modal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        title={editingContact ? 'Edit Contact' : 'Add Contact'}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormField label="First Name" required>
              <input
                type="text"
                value={contactForm.firstName}
                onChange={(e) => setContactForm({ ...contactForm, firstName: e.target.value })}
                placeholder="First name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </FormField>
            <FormField label="Last Name" required>
              <input
                type="text"
                value={contactForm.lastName}
                onChange={(e) => setContactForm({ ...contactForm, lastName: e.target.value })}
                placeholder="Last name"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
              />
            </FormField>
          </div>
          <FormField label="Email">
            <input
              type="email"
              value={contactForm.email}
              onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
              placeholder="email@example.com"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <FormField label="Phone">
            <input
              type="tel"
              value={contactForm.phone}
              onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
              placeholder="+44 20 1234 5678"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <FormField label="Role">
            <input
              type="text"
              value={contactForm.role}
              onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
              placeholder="e.g. CTO, Project Sponsor"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
            />
          </FormField>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPrimary"
              checked={contactForm.isPrimary}
              onChange={(e) => setContactForm({ ...contactForm, isPrimary: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="isPrimary" className="text-sm text-slate-700">
              Primary contact
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowContactModal(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveContact}
              disabled={savingContact}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 transition disabled:opacity-60"
            >
              {editingContact ? 'Update Contact' : 'Add Contact'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Contact Confirm */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingContactId(null);
        }}
        onConfirm={handleDeleteContact}
        title="Delete Contact"
        message="Are you sure you want to delete this contact? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default ClientsPage;
