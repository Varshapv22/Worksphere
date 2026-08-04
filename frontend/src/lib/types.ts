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
  employee_id: number;
  date: string;
  clock_in: string | null;
  clock_out: string | null;
}

export interface LeaveType {
  id: number;
  name: string;
  default_days?: number | null;
}

export type LeaveStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: number;
  employee_id: number;
  employee?: { id: number; full_name: string; employee_code: string } | null;
  leave_type_id: number;
  leave_type?: LeaveType;
  start_date: string;
  end_date: string;
  reason?: string | null;
  status: LeaveStatus;
  created_at?: string;
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
  enabled_at?: string | null;
  enabled_company_count?: number;
  created_at?: string;
  updated_at?: string;
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
  revenue: { mrr: number; arr: number };
  companies_near_limit: Array<{
    id: number;
    name: string;
    employee_count: number;
    max_employees: number;
    usage_percent: number;
  }>;
}
