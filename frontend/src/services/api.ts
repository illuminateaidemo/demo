/* ============================================================
   Project Intelligence Platform - API Service
   Centralized HTTP client with typed endpoint functions.
   ============================================================ */

import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
  Client,
  ClientContact,
  ClientFilters,
  Opportunity,
  OpportunityFilters,
  PipelineSummary,
  Project,
  ProjectPhase,
  ProjectHealthLog,
  ProjectFinancials,
  ProjectTeamMember,
  ProjectFilters,
  Resource,
  ResourceAllocation,
  ResourceDemand,
  ResourceFilters,
  ResourceCapacity,
  Timesheet,
  TimesheetEntry,
  TimesheetFilters,
  Expense,
  ExpenseFilters,
  WIPEntry,
  BillingMilestone,
  PostingPeriod,
  ApprovalRequest,
  ApprovalFilters,
  ApprovalSummary,
  DeliveryDashboard,
  ResourceDashboard,
  FinanceDashboard,
  LeadershipDashboard,
  MyDashboard,
  PaginatedResponse,
} from '../types';

// ─── Configuration ───────────────────────────────────────────

const BASE_URL = process.env.REACT_APP_API_URL || '/api/v1';

// ─── Token Management ────────────────────────────────────────

const TOKEN_KEY = 'pip_auth_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── API Error Class ─────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  detail: string;
  errors?: Record<string, string[]>;

  constructor(status: number, detail: string, errors?: Record<string, string[]>) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
    this.errors = errors;
  }
}

// ─── Generic Request Helper ──────────────────────────────────

function buildQueryString(params?: Record<string, unknown>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

async function request<T>(
  method: string,
  path: string,
  options?: {
    body?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    skipAuth?: boolean;
  }
): Promise<T> {
  const url = `${BASE_URL}${path}${buildQueryString(options?.params)}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const token = getToken();
  if (token && !options?.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
  };

  if (options?.body !== undefined) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  let data: unknown;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorBody = data as Record<string, unknown>;
    throw new ApiError(
      response.status,
      (errorBody?.detail as string) || response.statusText,
      errorBody?.errors as Record<string, string[]> | undefined
    );
  }

  return data as T;
}

function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  return request<T>('GET', path, { params });
}

function post<T>(path: string, body?: unknown, params?: Record<string, unknown>): Promise<T> {
  return request<T>('POST', path, { body, params });
}

function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, { body });
}

function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, { body });
}

function del<T = void>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}

// ─── Auth Endpoints ──────────────────────────────────────────

export const auth = {
  login(data: LoginRequest): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/login', data, undefined);
  },

  register(data: RegisterRequest): Promise<AuthResponse> {
    return post<AuthResponse>('/auth/register', data);
  },

  getMe(): Promise<User> {
    return get<User>('/auth/me');
  },
};

// ─── Client Endpoints ────────────────────────────────────────

export const clients = {
  list(filters?: ClientFilters): Promise<PaginatedResponse<Client>> {
    return get<PaginatedResponse<Client>>('/clients', filters as Record<string, unknown>);
  },

  create(data: Partial<Client>): Promise<Client> {
    return post<Client>('/clients', data);
  },

  get(id: string): Promise<Client> {
    return get<Client>(`/clients/${id}`);
  },

  update(id: string, data: Partial<Client>): Promise<Client> {
    return put<Client>(`/clients/${id}`, data);
  },

  delete(id: string): Promise<void> {
    return del(`/clients/${id}`);
  },

  addContact(clientId: string, data: Partial<ClientContact>): Promise<ClientContact> {
    return post<ClientContact>(`/clients/${clientId}/contacts`, data);
  },

  listContacts(clientId: string): Promise<ClientContact[]> {
    return get<ClientContact[]>(`/clients/${clientId}/contacts`);
  },
};

// ─── Opportunity Endpoints ───────────────────────────────────

export const opportunities = {
  list(filters?: OpportunityFilters): Promise<PaginatedResponse<Opportunity>> {
    return get<PaginatedResponse<Opportunity>>('/opportunities', filters as Record<string, unknown>);
  },

  create(data: Partial<Opportunity>): Promise<Opportunity> {
    return post<Opportunity>('/opportunities', data);
  },

  get(id: string): Promise<Opportunity> {
    return get<Opportunity>(`/opportunities/${id}`);
  },

  update(id: string, data: Partial<Opportunity>): Promise<Opportunity> {
    return put<Opportunity>(`/opportunities/${id}`, data);
  },

  convert(id: string, projectData: Partial<Project>): Promise<Project> {
    return post<Project>(`/opportunities/${id}/convert`, projectData);
  },

  pipelineSummary(): Promise<PipelineSummary> {
    return get<PipelineSummary>('/opportunities/pipeline/summary');
  },
};

// ─── Project Endpoints ───────────────────────────────────────

export const projects = {
  list(filters?: ProjectFilters): Promise<PaginatedResponse<Project>> {
    return get<PaginatedResponse<Project>>('/projects', filters as Record<string, unknown>);
  },

  create(data: Partial<Project>): Promise<Project> {
    return post<Project>('/projects', data);
  },

  get(id: string): Promise<Project> {
    return get<Project>(`/projects/${id}`);
  },

  update(id: string, data: Partial<Project>): Promise<Project> {
    return put<Project>(`/projects/${id}`, data);
  },

  addPhase(projectId: string, data: Partial<ProjectPhase>): Promise<ProjectPhase> {
    return post<ProjectPhase>(`/projects/${projectId}/phases`, data);
  },

  logHealth(projectId: string, data: Partial<ProjectHealthLog>): Promise<ProjectHealthLog> {
    return post<ProjectHealthLog>(`/projects/${projectId}/health`, data);
  },

  getFinancials(projectId: string): Promise<ProjectFinancials> {
    return get<ProjectFinancials>(`/projects/${projectId}/financials`);
  },

  getTeam(projectId: string): Promise<ProjectTeamMember[]> {
    return get<ProjectTeamMember[]>(`/projects/${projectId}/team`);
  },
};

// ─── Resource Endpoints ──────────────────────────────────────

export const resources = {
  list(filters?: ResourceFilters): Promise<PaginatedResponse<Resource>> {
    return get<PaginatedResponse<Resource>>('/resources', filters as Record<string, unknown>);
  },

  create(data: Partial<Resource>): Promise<Resource> {
    return post<Resource>('/resources', data);
  },

  get(id: string): Promise<Resource> {
    return get<Resource>(`/resources/${id}`);
  },

  update(id: string, data: Partial<Resource>): Promise<Resource> {
    return put<Resource>(`/resources/${id}`, data);
  },

  getAllocations(resourceId: string): Promise<ResourceAllocation[]> {
    return get<ResourceAllocation[]>(`/resources/${resourceId}/allocations`);
  },

  createAllocation(data: Partial<ResourceAllocation>): Promise<ResourceAllocation> {
    return post<ResourceAllocation>('/resources/allocations', data);
  },

  updateAllocation(id: string, data: Partial<ResourceAllocation>): Promise<ResourceAllocation> {
    return put<ResourceAllocation>(`/resources/allocations/${id}`, data);
  },

  approveAllocation(id: string): Promise<ResourceAllocation> {
    return post<ResourceAllocation>(`/resources/allocations/${id}/approve`);
  },

  getDemand(params?: { project_id?: string; status?: string }): Promise<ResourceDemand[]> {
    return get<ResourceDemand[]>('/resources/demand', params as Record<string, unknown>);
  },

  capacityOverview(params?: { from_date?: string; to_date?: string }): Promise<ResourceCapacity[]> {
    return get<ResourceCapacity[]>('/resources/capacity', params as Record<string, unknown>);
  },
};

// ─── Timesheet Endpoints ─────────────────────────────────────

export const timesheets = {
  list(filters?: TimesheetFilters): Promise<PaginatedResponse<Timesheet>> {
    return get<PaginatedResponse<Timesheet>>('/timesheets', filters as Record<string, unknown>);
  },

  getWeek(weekStarting: string, userId?: string): Promise<Timesheet> {
    return get<Timesheet>('/timesheets/week', { week_starting: weekStarting, user_id: userId });
  },

  create(data: Partial<Timesheet>): Promise<Timesheet> {
    return post<Timesheet>('/timesheets', data);
  },

  update(id: string, data: Partial<Timesheet>): Promise<Timesheet> {
    return put<Timesheet>(`/timesheets/${id}`, data);
  },

  addEntry(timesheetId: string, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return post<TimesheetEntry>(`/timesheets/${timesheetId}/entries`, data);
  },

  updateEntry(timesheetId: string, entryId: string, data: Partial<TimesheetEntry>): Promise<TimesheetEntry> {
    return put<TimesheetEntry>(`/timesheets/${timesheetId}/entries/${entryId}`, data);
  },

  deleteEntry(timesheetId: string, entryId: string): Promise<void> {
    return del(`/timesheets/${timesheetId}/entries/${entryId}`);
  },

  submit(id: string): Promise<Timesheet> {
    return post<Timesheet>(`/timesheets/${id}/submit`);
  },

  approve(id: string): Promise<Timesheet> {
    return post<Timesheet>(`/timesheets/${id}/approve`);
  },

  reject(id: string, reason: string): Promise<Timesheet> {
    return post<Timesheet>(`/timesheets/${id}/reject`, { reason });
  },

  lock(id: string): Promise<Timesheet> {
    return post<Timesheet>(`/timesheets/${id}/lock`);
  },
};

// ─── Expense Endpoints ───────────────────────────────────────

export const expenses = {
  list(filters?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    return get<PaginatedResponse<Expense>>('/expenses', filters as Record<string, unknown>);
  },

  create(data: Partial<Expense>): Promise<Expense> {
    return post<Expense>('/expenses', data);
  },

  get(id: string): Promise<Expense> {
    return get<Expense>(`/expenses/${id}`);
  },

  update(id: string, data: Partial<Expense>): Promise<Expense> {
    return put<Expense>(`/expenses/${id}`, data);
  },

  submit(id: string): Promise<Expense> {
    return post<Expense>(`/expenses/${id}/submit`);
  },

  approve(id: string): Promise<Expense> {
    return post<Expense>(`/expenses/${id}/approve`);
  },

  reject(id: string, reason: string): Promise<Expense> {
    return post<Expense>(`/expenses/${id}/reject`, { reason });
  },

  close(id: string): Promise<Expense> {
    return post<Expense>(`/expenses/${id}/close`);
  },
};

// ─── Financial Endpoints ─────────────────────────────────────

export const financial = {
  getWIP(params?: { project_id?: string; period_id?: string; status?: string }): Promise<WIPEntry[]> {
    return get<WIPEntry[]>('/financial/wip', params as Record<string, unknown>);
  },

  wipSummary(periodId?: string): Promise<{
    total_wip: number;
    pending_review: number;
    ready_to_post: number;
    posted: number;
    entries: WIPEntry[];
  }> {
    return get('/financial/wip/summary', { period_id: periodId });
  },

  generateWIP(periodId: string): Promise<WIPEntry[]> {
    return post<WIPEntry[]>('/financial/wip/generate', { period_id: periodId });
  },

  reviewWIP(id: string, data: { adjustment_amount?: number; adjustment_reason?: string }): Promise<WIPEntry> {
    return post<WIPEntry>(`/financial/wip/${id}/review`, data);
  },

  postWIP(id: string): Promise<WIPEntry> {
    return post<WIPEntry>(`/financial/wip/${id}/post`);
  },

  milestones(projectId?: string): Promise<BillingMilestone[]> {
    return get<BillingMilestone[]>('/financial/milestones', { project_id: projectId });
  },

  createMilestone(data: Partial<BillingMilestone>): Promise<BillingMilestone> {
    return post<BillingMilestone>('/financial/milestones', data);
  },

  updateMilestone(id: string, data: Partial<BillingMilestone>): Promise<BillingMilestone> {
    return put<BillingMilestone>(`/financial/milestones/${id}`, data);
  },

  periods(): Promise<PostingPeriod[]> {
    return get<PostingPeriod[]>('/financial/periods');
  },

  closePeriod(id: string, notes?: string): Promise<PostingPeriod> {
    return post<PostingPeriod>(`/financial/periods/${id}/close`, { notes });
  },

  exportData(params: {
    type: 'wip' | 'revenue' | 'expenses' | 'timesheets';
    period_id?: string;
    project_id?: string;
    format?: 'csv' | 'xlsx';
  }): Promise<Blob> {
    const url = `${BASE_URL}/financial/export${buildQueryString(params as Record<string, unknown>)}`;
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { headers }).then((res) => {
      if (!res.ok) throw new ApiError(res.status, 'Export failed');
      return res.blob();
    });
  },
};

// ─── Approval Endpoints ─────────────────────────────────────

export const approvals = {
  list(filters?: ApprovalFilters): Promise<PaginatedResponse<ApprovalRequest>> {
    return get<PaginatedResponse<ApprovalRequest>>('/approvals', filters as Record<string, unknown>);
  },

  history(filters?: ApprovalFilters): Promise<PaginatedResponse<ApprovalRequest>> {
    return get<PaginatedResponse<ApprovalRequest>>('/approvals/history', filters as Record<string, unknown>);
  },

  approve(id: string, notes?: string): Promise<ApprovalRequest> {
    return post<ApprovalRequest>(`/approvals/${id}/approve`, { notes });
  },

  reject(id: string, notes: string): Promise<ApprovalRequest> {
    return post<ApprovalRequest>(`/approvals/${id}/reject`, { notes });
  },

  summary(): Promise<ApprovalSummary> {
    return get<ApprovalSummary>('/approvals/summary');
  },
};

// ─── Dashboard Endpoints ─────────────────────────────────────

export const dashboards = {
  delivery(): Promise<DeliveryDashboard> {
    return get<DeliveryDashboard>('/dashboards/delivery');
  },

  resources(): Promise<ResourceDashboard> {
    return get<ResourceDashboard>('/dashboards/resources');
  },

  finance(): Promise<FinanceDashboard> {
    return get<FinanceDashboard>('/dashboards/finance');
  },

  leadership(): Promise<LeadershipDashboard> {
    return get<LeadershipDashboard>('/dashboards/leadership');
  },

  my(): Promise<MyDashboard> {
    return get<MyDashboard>('/dashboards/my');
  },
};

// ─── Convenience: grouped API export ─────────────────────────

const api = {
  auth,
  clients,
  opportunities,
  projects,
  resources,
  timesheets,
  expenses,
  financial,
  approvals,
  dashboards,
};

export default api;
