// Shared API types for the WorkSphere frontend.

export interface Company {
  id: number;
  name: string;
  slug: string;
  email: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  company_id?: number;
  company?: Company;
  roles?: string[];
  permissions?: string[];
  is_super_admin?: boolean;
  /** The employee record linked to this login, if any (lets an admin/manager act as an employee too — clock in/out, request leave). */
  employee?: { id: number } | null;
}

export interface Department {
  id: number;
  name: string;
  description?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type EmploymentStatus = "active" | "on_leave" | "terminated" | string;

export interface Designation {
  id: number;
  title: string;
  department?: { id: number; name: string } | null;
  created_at?: string;
  updated_at?: string;
}

export interface Employee {
  id: number;
  employee_code: string;
  first_name: string;
  last_name: string;
  full_name: string;
  email: string;
  phone?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  date_of_joining?: string | null;
  employment_status?: EmploymentStatus;
  address?: Record<string, unknown> | null;
  emergency_contact?: Record<string, unknown> | null;
  department?: { id: number; name: string } | null;
  designation?: { id: number; title: string } | null;
  manager?: { id: number; full_name: string } | null;
  has_login?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecord {
  id: number;
  employee?: { id: number; full_name: string; employee_code?: string } | null;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
}

export interface LeaveType {
  id: number;
  name: string;
  days_per_year?: number | null;
  is_paid?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface WorkingHourConfig {
  id: number;
  company_id: number;
  work_start_time: string;
  work_end_time: string;
  standard_hours_per_day: number;
  late_grace_minutes: number;
  half_day_threshold_hours: number;
  work_days: string[];
  created_at?: string;
  updated_at?: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveBalanceBreakdown {
  leave_type_id: number;
  leave_type: string;
  year: number;
  allocated: number;
  used: number;
  carry_forward: number;
  remaining: number;
}

export interface LeaveBalanceSummary {
  year: number;
  total_allocated: number;
  total_carry_forward: number;
  total_used: number;
  total_remaining: number;
  breakdown: LeaveBalanceBreakdown[];
}

export interface LeaveRequest {
  id: number;
  employee?: { id: number; full_name: string; employee_code: string } | null;
  leave_type_id: number;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  days: number;
  is_half_day: boolean;
  reason?: string | null;
  status: LeaveStatus;
  approved_by?: string | null;
  approved_at?: string | null;
  created_at?: string;
}

export interface Holiday {
  id: number;
  name: string;
  date: string;
  created_at?: string;
}

export interface AdminActivityLog {
  id: number;
  action: string;
  subject_type: string | null;
  subject_id: number | null;
  subject_label: string | null;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  admin: { id: number; name: string; email: string } | null;
  created_at: string;
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  total: number;
  per_page?: number;
}

export interface PaginationLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginationMeta;
  links: PaginationLinks;
}

export type InsightSeverity = "critical" | "warning" | "opportunity" | "info";
export type InsightType = "burnout" | "promotion" | "staffing" | "payroll";

export interface InsightMetric {
  label: string;
  value: string;
}

export interface InsightItem {
  label: string;
  sublabel?: string | null;
  value: string;
}

export interface WorkforceInsight {
  id: string;
  type: InsightType;
  severity: InsightSeverity;
  title: string;
  description: string;
  metric: InsightMetric;
  items: InsightItem[];
}

export interface AdvisorResponse {
  data: WorkforceInsight[];
  generated_at: string;
}

export interface SubscriptionPlan {
  id: number;
  name: string;
  slug: string;
  price_monthly: string | number;
  max_employees: number;
  features?: string[] | Record<string, unknown> | null;
  is_active: boolean;
  company_count?: number;
  created_at?: string;
  updated_at?: string;
}

export type CompanyStatus = "pending" | "approved" | "rejected";

export interface AdminCompany {
  id: number;
  name: string;
  slug: string;
  email: string;
  phone: string | null;
  address: string | null;
  timezone: string;
  currency: string;
  is_active: boolean;
  status: CompanyStatus;
  trial_ends_at: string | null;
  employee_count: number;
  subscription_plan: {
    id: number;
    name: string;
    slug: string;
    price_monthly: string | number;
    max_employees: number;
  } | null;
  usage_percent: number | null;
  created_at: string;
}

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "normal" | "high" | "urgent";

export interface SupportTicketMessage {
  id: number;
  body: string;
  user: { id: number; name: string; is_super_admin: boolean } | null;
  created_at: string;
}

export interface SupportTicket {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  company?: { id: number; name: string } | null;
  created_by: { id: number; name: string } | null;
  messages?: SupportTicketMessage[];
  created_at: string;
  updated_at: string;
}

export interface FeatureFlag {
  id: number;
  key: string;
  label: string;
  description: string | null;
  is_enabled_globally: boolean;
  created_at: string;
}

export interface CompanyFeatureFlag {
  id: number;
  key: string;
  label: string;
  description: string | null;
  is_enabled_globally: boolean;
  has_override: boolean;
  is_enabled: boolean;
}

export interface AllowedIp {
  id: number;
  ip_address: string;
  label: string | null;
  created_at: string;
}

export type AnnouncementLevel = "info" | "warning" | "critical";
export type AnnouncementAudience = "all" | "specific";

export interface AdminAnnouncement {
  id: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
  audience_type: AnnouncementAudience;
  company_ids?: number[];
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface ActiveAnnouncement {
  id: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
}

export interface CompanyAnnouncement {
  id: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  created_at: string;
}

export type InvoiceStatus = "pending" | "submitted" | "paid" | "overdue" | "cancelled";

export interface Invoice {
  id: number;
  amount: string | number;
  currency: string;
  period_start: string;
  period_end: string;
  status: InvoiceStatus;
  upi_reference: string | null;
  submitted_at: string | null;
  paid_at: string | null;
  notes: string | null;
  company?: { id: number; name: string } | null;
  subscription_plan: { id: number; name: string } | null;
  created_at: string;
}

export interface PlatformSettings {
  upi_id: string | null;
  upi_payee_name: string | null;
}

export interface Module {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  category?: string | null;
  sort_order?: number;
  is_active: boolean;
  is_available: boolean;
  is_enabled?: boolean;
  is_granted?: boolean;
  enabled_at?: string | null;
  enabled_company_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface Skill {
  id: number;
  name: string;
  category?: string | null;
  created_at?: string;
}

export interface SkillMatrixEmployee {
  id: number;
  full_name: string;
  employee_code: string;
  department?: string | null;
  skill_map: Record<number, number>; // skill_id → proficiency (1-5)
}

export interface SkillMatrix {
  skills: Skill[];
  employees: SkillMatrixEmployee[];
}

export type ResumeStatus = "processing" | "completed" | "failed";

export interface ResumeExperience {
  title: string;
  company: string;
  duration: string;
  description?: string;
}

export interface ResumeEducation {
  degree: string;
  institution: string;
  year?: string | null;
  gpa?: string | null;
}

export interface ResumeProject {
  name: string;
  description?: string;
  technologies?: string[];
}

export interface ParsedResume {
  id: number;
  file_name: string;
  status: ResumeStatus;
  error_message?: string | null;
  candidate_name?: string | null;
  email?: string | null;
  phone?: string | null;
  summary?: string | null;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation[];
  companies: string[];
  projects: ResumeProject[];
  certifications: string[];
  created_at?: string;
}

// ─── Employee 360 Profile types ──────────────────────────────────────────────

export interface Profile360Attendance {
  id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
  work_minutes: number | null;
}

export interface Profile360LeaveBalance {
  id: number;
  leave_type: string;
  year: number;
  allocated: number;
  used: number;
  remaining: number;
}

export interface Profile360LeaveRequest {
  id: number;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  status: string;
  reason?: string | null;
}

export interface Profile360PayrollRecord {
  id: number;
  period: string;
  period_month: number;
  period_year: number;
  basic_salary: number;
  allowances: number;
  bonus: number;
  overtime_pay: number;
  deductions: number;
  net_salary: number;
  status: string;
}

export interface Profile360Review {
  id: number;
  review_period: string;
  communication_rating: number;
  technical_rating: number;
  teamwork_rating: number;
  leadership_rating: number;
  overall_score: number;
  summary?: string | null;
  reviewer?: string | null;
  created_at: string;
}

export interface Profile360Skill {
  id: number;
  name: string;
  category?: string | null;
  proficiency: number;
}

export interface Profile360Project {
  id: number;
  project_name: string;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  status: "active" | "completed" | "on_hold";
  created_at: string;
}

export interface Profile360Asset {
  id: number;
  name: string;
  type?: string | null;
  serial_number?: string | null;
  assigned_date?: string | null;
  returned_date?: string | null;
}

export interface Profile360Training {
  id: number;
  course_name: string;
  provider?: string | null;
  completed_date?: string | null;
  status: "enrolled" | "completed" | "failed";
}

export interface Profile360Certificate {
  id: number;
  name: string;
  issuer?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
}

export interface Profile360Document {
  id: number;
  name: string;
  type?: string | null;
  url?: string | null;
  created_at: string;
}

export interface Profile360Note {
  id: number;
  body: string;
  type: "general" | "hr" | "performance";
  author?: string | null;
  created_at: string;
}

export interface Profile360TimelineEvent {
  id: string;
  type: string;
  title: string;
  description?: string | null;
  date: string;
}

export interface Employee360 {
  employee: Employee;
  attendance: { recent: Profile360Attendance[] };
  leave: { balances: Profile360LeaveBalance[]; recent: Profile360LeaveRequest[] };
  payroll: { records: Profile360PayrollRecord[] };
  performance: { reviews: Profile360Review[] };
  skills: Profile360Skill[];
  projects: Profile360Project[];
  assets: Profile360Asset[];
  training: Profile360Training[];
  certificates: Profile360Certificate[];
  documents: Profile360Document[];
  notes: Profile360Note[];
  timeline: Profile360TimelineEvent[];
}

// ─── Knowledge Base ───────────────────────────────────────────────────────────

export interface KbArticle {
  id: number;
  title: string;
  category: string;
  body?: string;
  excerpt?: string;
  tags: string[];
  author: { id: number; name: string } | null;
  is_published: boolean;
  views: number;
  created_at?: string;
  updated_at?: string;
}

export interface KbCategory {
  name: string;
  count: number;
}

// ─── Employee Recognition ─────────────────────────────────────────────────────

export interface RecognitionBadge {
  id: number;
  name: string;
  emoji: string;
  description: string | null;
  color: string;
}

export interface Recognition {
  id: number;
  employee: { id: number; full_name: string; designation: string | null } | null;
  awarded_by: { id: number; name: string } | null;
  badge: RecognitionBadge | null;
  message: string | null;
  created_at?: string;
}

// ─── Career Roadmap ───────────────────────────────────────────────────────────

export interface CareerResource {
  title: string;
  url: string;
  type?: string;
}

export interface CareerStep {
  id: number;
  title: string;
  description?: string | null;
  skills_required: string[];
  resources: CareerResource[];
  sort_order: number;
}

export interface CareerTrack {
  id: number;
  title: string;
  description?: string | null;
  target_role: string;
  is_active: boolean;
  sort_order: number;
  steps: CareerStep[];
  created_at?: string;
}

export interface CareerEnrollment {
  id: number;
  employee_id: number;
  career_track_id?: number;
  employee?: { id: number; full_name: string; designation: string | null } | null;
  track?: CareerTrack;
  current_step: number;
  started_at?: string | null;
  completed_at?: string | null;
}

// ─── Meetings ─────────────────────────────────────────────────────────────────

export type ActionItemStatus = "open" | "in_progress" | "done";

export interface MeetingActionItem {
  id: number;
  meeting_id: number;
  title: string;
  description?: string | null;
  assignee?: { id: number; full_name: string } | null;
  due_date?: string | null;
  status: ActionItemStatus;
  completed_at?: string | null;
}

export interface Meeting {
  id: number;
  title: string;
  description?: string | null;
  notes?: string | null;
  meeting_at: string;
  organizer?: { id: number; name: string } | null;
  attendee_ids: number[];
  action_items: MeetingActionItem[];
  created_at?: string;
}

// ─── Asset Lifecycle ──────────────────────────────────────────────────────────

export type AssetStatus = "purchased" | "assigned" | "maintenance" | "returned" | "disposed";

export interface Asset {
  id: number;
  name: string;
  type?: string | null;
  serial_number?: string | null;
  brand?: string | null;
  model?: string | null;
  purchase_date?: string | null;
  purchase_cost?: number | null;
  warranty_expiry?: string | null;
  status: AssetStatus;
  assigned_to?: { id: number; full_name: string } | null;
  assigned_date?: string | null;
  returned_date?: string | null;
  notes?: string | null;
  created_at?: string;
}

// ─── Compliance ───────────────────────────────────────────────────────────────

export type ComplianceType =
  | "passport" | "visa" | "certification" | "insurance"
  | "medical" | "drivers_license" | "contract" | "other";

export type ComplianceStatus = "valid" | "expiring_soon" | "expired";

export interface ComplianceItem {
  id: number;
  type: ComplianceType;
  name: string;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  status: ComplianceStatus;
  notes?: string | null;
  employee?: { id: number; full_name: string } | null;
  days_until_expiry?: number | null;
  created_at?: string;
}

// ─── Payroll Config ───────────────────────────────────────────────────────────

export interface PayrollConfig {
  id: number;
  country_code: string;
  country_name: string;
  currency_code: string;
  currency_symbol: string;
  tax_rate: number;
  provident_fund_rate: number;
  payroll_frequency: "weekly" | "bi_weekly" | "monthly";
  timezone: string;
  holidays?: { name: string; date: string }[];
  tax_brackets?: { min: number; max: number; rate: number }[];
  is_active: boolean;
}

// ─── Developer API ────────────────────────────────────────────────────────────

export interface ApiKey {
  id: number;
  name: string;
  key_preview: string;
  key?: string;  // returned only on creation
  scopes: string[];
  is_active: boolean;
  last_used_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
}

export interface Webhook {
  id: number;
  name: string;
  url: string;
  events: string[];
  secret?: string; // returned only on creation
  is_active: boolean;
  last_triggered_at?: string | null;
  failure_count: number;
  created_at?: string;
}

// ─── White Label ──────────────────────────────────────────────────────────────

export interface WhiteLabelConfig {
  app_name?: string | null;
  logo_url?: string | null;
  favicon_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  login_message?: string | null;
  support_email?: string | null;
  custom_domain?: string | null;
  email_footer?: Record<string, string> | null;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface AnalyticsOverview {
  headcount: {
    total: number;
    active: number;
    new_hires_month: number;
    terminated_month: number;
  };
  attendance: {
    rate_percent: number;
    avg_daily_present: number;
    approved_leaves_month: number;
  };
  payroll: {
    this_month: number;
    last_month: number;
    growth_pct: number;
  };
}

export interface OrgNode {
  id: number;
  full_name: string;
  email: string;
  employee_code: string;
  employment_status: string;
  manager_id: number | null;
  designation: { id: number; title: string } | null;
  department: { id: number; name: string } | null;
  children: OrgNode[];
}

export interface PlatformStats {
  companies: {
    total: number;
    pending: number;
    active: number;
    suspended: number;
    rejected: number;
    on_trial: number;
    new_this_month: number;
  };
  employees: { total: number };
  users: { total: number };
  revenue: {
    mrr: number;
    arr: number;
    by_plan: Array<{ plan_id: number; plan_name: string; company_count: number; mrr: number }>;
  };
  companies_near_limit: Array<{
    id: number;
    name: string;
    employee_count: number;
    max_employees: number;
    usage_percent: number;
  }>;
  trial_ending_soon: Array<{
    id: number;
    name: string;
    trial_ends_at: string;
    days_left: number;
  }>;
}
