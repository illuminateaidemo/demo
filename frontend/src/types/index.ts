/* ============================================================
   Project Intelligence Platform - TypeScript Type Definitions
   Complete interfaces matching all backend schemas.
   ============================================================ */

// ─── Enumerations ────────────────────────────────────────────

export enum UserRole {
  ADMIN = 'ADMIN',
  PARTNER = 'PARTNER',
  DIRECTOR = 'DIRECTOR',
  PROJECT_MANAGER = 'PROJECT_MANAGER',
  CONSULTANT = 'CONSULTANT',
  FINANCE = 'FINANCE',
  HR = 'HR',
  VIEWER = 'VIEWER',
}

export enum OpportunityStatus {
  LEAD = 'LEAD',
  QUALIFIED = 'QUALIFIED',
  PROPOSAL = 'PROPOSAL',
  NEGOTIATION = 'NEGOTIATION',
  WON = 'WON',
  LOST = 'LOST',
  ABANDONED = 'ABANDONED',
}

export enum ProjectStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  ON_HOLD = 'ON_HOLD',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  ARCHIVED = 'ARCHIVED',
}

export enum CommercialModel {
  TIME_AND_MATERIALS = 'TIME_AND_MATERIALS',
  FIXED_PRICE = 'FIXED_PRICE',
  RETAINER = 'RETAINER',
  MILESTONE = 'MILESTONE',
  CAPPED_TM = 'CAPPED_TM',
}

export enum HealthStatus {
  GREEN = 'GREEN',
  AMBER = 'AMBER',
  RED = 'RED',
}

export enum AllocationStatus {
  PROPOSED = 'PROPOSED',
  CONFIRMED = 'CONFIRMED',
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TimesheetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  LOCKED = 'LOCKED',
}

export enum ActivityType {
  BILLABLE = 'BILLABLE',
  NON_BILLABLE = 'NON_BILLABLE',
  INTERNAL = 'INTERNAL',
  LEAVE = 'LEAVE',
  TRAINING = 'TRAINING',
  BUSINESS_DEVELOPMENT = 'BUSINESS_DEVELOPMENT',
  ADMIN = 'ADMIN',
}

export enum ExpenseCategory {
  TRAVEL = 'TRAVEL',
  ACCOMMODATION = 'ACCOMMODATION',
  MEALS = 'MEALS',
  TRANSPORT = 'TRANSPORT',
  SOFTWARE = 'SOFTWARE',
  EQUIPMENT = 'EQUIPMENT',
  ENTERTAINMENT = 'ENTERTAINMENT',
  OFFICE_SUPPLIES = 'OFFICE_SUPPLIES',
  COMMUNICATIONS = 'COMMUNICATIONS',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
  CLOSED = 'CLOSED',
}

export enum ApprovalRequestType {
  TIMESHEET = 'TIMESHEET',
  EXPENSE = 'EXPENSE',
  ALLOCATION = 'ALLOCATION',
  PROJECT_CHANGE = 'PROJECT_CHANGE',
  BUDGET_OVERRIDE = 'BUDGET_OVERRIDE',
  WIP_ADJUSTMENT = 'WIP_ADJUSTMENT',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ESCALATED = 'ESCALATED',
  WITHDRAWN = 'WITHDRAWN',
}

// ─── User ────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  title?: string;
  department?: string;
  phone?: string;
  avatar_url?: string;
  hourly_cost?: number;
  hourly_rate?: number;
  utilisation_target?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ─── Client ──────────────────────────────────────────────────

export interface ClientContact {
  id: string;
  client_id: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  is_primary: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  name: string;
  code: string;
  industry?: string;
  website?: string;
  address?: string;
  city?: string;
  country?: string;
  tax_id?: string;
  payment_terms?: number;
  credit_limit?: number;
  notes?: string;
  is_active: boolean;
  contacts?: ClientContact[];
  created_at: string;
  updated_at: string;
}

// ─── Opportunity ─────────────────────────────────────────────

export interface Opportunity {
  id: string;
  title: string;
  client_id: string;
  client?: Client;
  owner_id: string;
  owner?: User;
  status: OpportunityStatus;
  value: number;
  currency: string;
  probability: number;
  expected_close_date?: string;
  actual_close_date?: string;
  description?: string;
  source?: string;
  next_steps?: string;
  competitors?: string;
  project_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PipelineSummary {
  total_value: number;
  weighted_value: number;
  count: number;
  by_status: Record<OpportunityStatus, { count: number; value: number }>;
  conversion_rate: number;
  average_deal_size: number;
}

// ─── Project ─────────────────────────────────────────────────

export interface ProjectPhase {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  budget_hours?: number;
  budget_amount?: number;
  status: ProjectStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectHealthLog {
  id: string;
  project_id: string;
  logged_by_id: string;
  logged_by?: User;
  overall_health: HealthStatus;
  scope_health: HealthStatus;
  schedule_health: HealthStatus;
  budget_health: HealthStatus;
  team_health: HealthStatus;
  summary: string;
  risks?: string;
  issues?: string;
  mitigations?: string;
  log_date: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  code: string;
  client_id: string;
  client?: Client;
  manager_id: string;
  manager?: User;
  partner_id?: string;
  partner?: User;
  opportunity_id?: string;
  status: ProjectStatus;
  commercial_model: CommercialModel;
  start_date: string;
  end_date?: string;
  budget_hours?: number;
  budget_amount?: number;
  contracted_amount?: number;
  currency: string;
  description?: string;
  objectives?: string;
  current_health?: HealthStatus;
  phases?: ProjectPhase[];
  health_logs?: ProjectHealthLog[];
  created_at: string;
  updated_at: string;
}

export interface ProjectFinancials {
  project_id: string;
  budget_amount: number;
  contracted_amount: number;
  actual_cost: number;
  actual_revenue: number;
  billed_amount: number;
  collected_amount: number;
  wip_amount: number;
  hours_budget: number;
  hours_actual: number;
  hours_remaining: number;
  margin_percentage: number;
  burn_rate: number;
  estimate_at_completion: number;
  variance_at_completion: number;
}

export interface ProjectTeamMember {
  user: User;
  allocation: ResourceAllocation;
  hours_logged: number;
  current_week_hours: number;
}

// ─── Resource ────────────────────────────────────────────────

export interface Resource {
  id: string;
  user_id: string;
  user?: User;
  skills: string[];
  certifications?: string[];
  availability_start?: string;
  availability_end?: string;
  max_hours_per_week: number;
  location?: string;
  timezone?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceAllocation {
  id: string;
  resource_id: string;
  resource?: Resource;
  project_id: string;
  project?: Project;
  phase_id?: string;
  phase?: ProjectPhase;
  role_on_project: string;
  status: AllocationStatus;
  start_date: string;
  end_date: string;
  hours_per_week: number;
  hourly_rate?: number;
  hourly_cost?: number;
  notes?: string;
  approved_by_id?: string;
  approved_by?: User;
  created_at: string;
  updated_at: string;
}

export interface ResourceDemand {
  id: string;
  project_id: string;
  project?: Project;
  role: string;
  skills_required: string[];
  seniority_level?: string;
  start_date: string;
  end_date: string;
  hours_per_week: number;
  hourly_rate_budget?: number;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ResourceCapacity {
  resource_id: string;
  user: User;
  total_capacity_hours: number;
  allocated_hours: number;
  available_hours: number;
  utilisation_percentage: number;
  allocations: ResourceAllocation[];
}

// ─── Timesheet ───────────────────────────────────────────────

export interface TimesheetEntry {
  id: string;
  timesheet_id: string;
  project_id: string;
  project?: Project;
  phase_id?: string;
  phase?: ProjectPhase;
  activity_type: ActivityType;
  date: string;
  hours: number;
  description?: string;
  is_billable: boolean;
  billing_rate?: number;
  created_at: string;
  updated_at: string;
}

export interface Timesheet {
  id: string;
  user_id: string;
  user?: User;
  week_starting: string;
  week_ending: string;
  status: TimesheetStatus;
  total_hours: number;
  billable_hours: number;
  non_billable_hours: number;
  submitted_at?: string;
  approved_at?: string;
  approved_by_id?: string;
  approved_by?: User;
  rejection_reason?: string;
  entries?: TimesheetEntry[];
  created_at: string;
  updated_at: string;
}

// ─── Expense ─────────────────────────────────────────────────

export interface Expense {
  id: string;
  user_id: string;
  user?: User;
  project_id: string;
  project?: Project;
  category: ExpenseCategory;
  description: string;
  amount: number;
  currency: string;
  expense_date: string;
  receipt_url?: string;
  status: ExpenseStatus;
  is_billable: boolean;
  client_billable_amount?: number;
  submitted_at?: string;
  approved_at?: string;
  approved_by_id?: string;
  approved_by?: User;
  rejection_reason?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Billing & WIP ──────────────────────────────────────────

export interface BillingMilestone {
  id: string;
  project_id: string;
  project?: Project;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  due_date: string;
  status: string;
  invoice_number?: string;
  invoiced_date?: string;
  paid_date?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface WIPEntry {
  id: string;
  project_id: string;
  project?: Project;
  period_id: string;
  labour_cost: number;
  labour_revenue: number;
  expense_cost: number;
  expense_revenue: number;
  total_wip: number;
  adjustment_amount: number;
  adjustment_reason?: string;
  status: string;
  reviewed_by_id?: string;
  reviewed_by?: User;
  reviewed_at?: string;
  posted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface PostingPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  status: string;
  closed_by_id?: string;
  closed_by?: User;
  closed_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

// ─── Approvals ───────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  type: ApprovalRequestType;
  status: ApprovalStatus;
  requestor_id: string;
  requestor?: User;
  approver_id: string;
  approver?: User;
  entity_id: string;
  entity_type: string;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
  requested_at: string;
  decided_at?: string;
  decision_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ApprovalSummary {
  pending_count: number;
  approved_today: number;
  rejected_today: number;
  by_type: Record<ApprovalRequestType, number>;
  overdue_count: number;
}

// ─── Dashboard Types ─────────────────────────────────────────

export interface UtilisationSummary {
  overall_utilisation: number;
  billable_utilisation: number;
  target_utilisation: number;
  total_capacity_hours: number;
  total_billable_hours: number;
  total_non_billable_hours: number;
  total_available_hours: number;
  by_department: Array<{
    department: string;
    utilisation: number;
    headcount: number;
    billable_hours: number;
    capacity_hours: number;
  }>;
  by_role: Array<{
    role: UserRole;
    utilisation: number;
    headcount: number;
    billable_hours: number;
  }>;
  trend: Array<{
    week: string;
    utilisation: number;
    billable_hours: number;
    capacity_hours: number;
  }>;
}

export interface ProjectHealthSummary {
  total_projects: number;
  active_projects: number;
  green_count: number;
  amber_count: number;
  red_count: number;
  no_status_count: number;
  projects_at_risk: Array<{
    project: Project;
    latest_health: ProjectHealthLog;
    days_at_risk: number;
  }>;
  health_trend: Array<{
    date: string;
    green: number;
    amber: number;
    red: number;
  }>;
}

export interface FinancialSummary {
  total_revenue: number;
  total_cost: number;
  total_margin: number;
  margin_percentage: number;
  total_wip: number;
  total_billed: number;
  total_collected: number;
  outstanding_receivables: number;
  dso: number;
  revenue_trend: Array<{
    month: string;
    revenue: number;
    cost: number;
    margin: number;
  }>;
  top_projects_by_revenue: Array<{
    project: Project;
    revenue: number;
    margin: number;
    margin_percentage: number;
  }>;
  by_commercial_model: Record<CommercialModel, {
    revenue: number;
    cost: number;
    margin: number;
    project_count: number;
  }>;
}

export interface ResourceCapacitySummary {
  total_resources: number;
  allocated_count: number;
  available_count: number;
  over_allocated_count: number;
  average_utilisation: number;
  upcoming_availability: Array<{
    resource: Resource;
    available_from: string;
    available_hours: number;
    skills: string[];
  }>;
  demand_vs_supply: Array<{
    week: string;
    demand_hours: number;
    supply_hours: number;
    gap: number;
  }>;
  by_skill: Array<{
    skill: string;
    demand_count: number;
    supply_count: number;
    gap: number;
  }>;
}

export interface DeliveryDashboard {
  health_summary: ProjectHealthSummary;
  active_projects: Project[];
  upcoming_milestones: BillingMilestone[];
  recent_health_logs: ProjectHealthLog[];
  overdue_items: Array<{
    type: string;
    entity_id: string;
    title: string;
    due_date: string;
    days_overdue: number;
  }>;
}

export interface ResourceDashboard {
  capacity_summary: ResourceCapacitySummary;
  utilisation_summary: UtilisationSummary;
  pending_allocations: ResourceAllocation[];
  open_demands: ResourceDemand[];
}

export interface FinanceDashboard {
  financial_summary: FinancialSummary;
  wip_summary: {
    total_wip: number;
    pending_review: number;
    ready_to_post: number;
    entries: WIPEntry[];
  };
  outstanding_invoices: BillingMilestone[];
  current_period: PostingPeriod;
}

export interface LeadershipDashboard {
  financial_summary: FinancialSummary;
  health_summary: ProjectHealthSummary;
  utilisation_summary: UtilisationSummary;
  pipeline_summary: PipelineSummary;
  key_metrics: {
    revenue_per_head: number;
    average_project_margin: number;
    client_satisfaction: number;
    employee_utilisation: number;
    pipeline_coverage: number;
    win_rate: number;
  };
}

export interface MyDashboard {
  user: User;
  current_timesheet: Timesheet | null;
  active_allocations: ResourceAllocation[];
  pending_approvals: ApprovalRequest[];
  pending_expenses: Expense[];
  my_projects: Project[];
  hours_this_week: number;
  hours_this_month: number;
  utilisation_this_month: number;
}

// ─── API Response Types ──────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ApiError {
  detail: string;
  status_code: number;
  errors?: Record<string, string[]>;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  role?: UserRole;
}

// ─── Query / Filter Parameters ───────────────────────────────

export interface PaginationParams {
  page?: number;
  page_size?: number;
}

export interface ProjectFilters extends PaginationParams {
  status?: ProjectStatus;
  client_id?: string;
  manager_id?: string;
  health?: HealthStatus;
  commercial_model?: CommercialModel;
  search?: string;
}

export interface OpportunityFilters extends PaginationParams {
  status?: OpportunityStatus;
  client_id?: string;
  owner_id?: string;
  min_value?: number;
  max_value?: number;
  search?: string;
}

export interface TimesheetFilters extends PaginationParams {
  user_id?: string;
  status?: TimesheetStatus;
  week_starting?: string;
  project_id?: string;
}

export interface ExpenseFilters extends PaginationParams {
  user_id?: string;
  project_id?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  from_date?: string;
  to_date?: string;
}

export interface ResourceFilters extends PaginationParams {
  skill?: string;
  available_from?: string;
  available_to?: string;
  min_hours?: number;
  location?: string;
  search?: string;
}

export interface ApprovalFilters extends PaginationParams {
  type?: ApprovalRequestType;
  status?: ApprovalStatus;
  approver_id?: string;
  requestor_id?: string;
}

export interface ClientFilters extends PaginationParams {
  industry?: string;
  is_active?: boolean;
  search?: string;
}
