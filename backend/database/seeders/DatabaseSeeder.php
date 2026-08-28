<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\Module;
use App\Models\Payroll;
use App\Models\PerformanceReview;
use App\Models\SubscriptionPlan;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Role/permission definitions are global (team_id null) - only role
        // *assignments* are scoped per tenant via setPermissionsTeamId().
        setPermissionsTeamId(null);

        $permissions = [
            'employees.manage',
            'employees.view',
            'attendance.manage',
            'attendance.view',
            'leave.manage',
            'leave.approve',
            'leave.request',
            'departments.manage',
            'announcements.manage',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        $companyAdmin = Role::firstOrCreate(['name' => 'company-admin', 'guard_name' => 'web']);
        $companyAdmin->syncPermissions($permissions);

        $manager = Role::firstOrCreate(['name' => 'manager', 'guard_name' => 'web']);
        $manager->syncPermissions([
            'employees.view',
            'attendance.view',
            'attendance.manage',
            'leave.approve',
            'leave.request',
        ]);

        $employee = Role::firstOrCreate(['name' => 'employee', 'guard_name' => 'web']);
        $employee->syncPermissions([
            'employees.view',
            'leave.request',
        ]);

        // Super admin - central user, no tenant.
        User::firstOrCreate(
            ['email' => 'admin@worksphere.test'],
            [
                'name' => 'WorkSphere Super Admin',
                'password' => Hash::make('password'),
                'company_id' => null,
                'is_super_admin' => true,
                'email_verified_at' => now(),
            ]
        );

        // Shared subscription plans.
        $starter = SubscriptionPlan::factory()->create(['name' => 'Starter', 'slug' => 'starter', 'price_monthly' => 0, 'max_employees' => 25]);
        $growth = SubscriptionPlan::factory()->create(['name' => 'Growth', 'slug' => 'growth', 'price_monthly' => 99, 'max_employees' => 200]);

        $this->seedCompany('Acme Corporation', 'acme-corporation', $starter, $companyAdmin);
        $this->seedCompany('Globex Industries', 'globex-industries', $growth, $companyAdmin);
    }

    private function seedCompany(string $name, string $slug, SubscriptionPlan $plan, Role $companyAdminRole): void
    {
        $company = Company::factory()->create([
            'name' => $name,
            'slug' => $slug,
            'email' => strtolower(str_replace(' ', '', $slug)).'@worksphere.test',
            'subscription_plan_id' => $plan->id,
            'status' => 'approved',
        ]);

        // Attendance ships built and enabled by default; every other
        // marketplace module starts uninstalled until a company opts in.
        if ($attendanceModule = Module::where('slug', 'attendance')->first()) {
            $company->modules()->attach($attendanceModule->id, ['is_enabled' => true, 'enabled_at' => now()]);
        }

        setPermissionsTeamId($company->id);

        // Two departments per company.
        $engineering = Department::factory()->create(['company_id' => $company->id, 'name' => 'Engineering']);
        $humanResources = Department::factory()->create(['company_id' => $company->id, 'name' => 'Human Resources']);

        // One designation per department.
        $engineerDesignation = Designation::factory()->create([
            'company_id' => $company->id,
            'department_id' => $engineering->id,
            'title' => 'Software Engineer',
        ]);

        $hrDesignation = Designation::factory()->create([
            'company_id' => $company->id,
            'department_id' => $humanResources->id,
            'title' => 'HR Generalist',
        ]);

        // Company-admin login user, linked to an employee record.
        $adminUser = User::factory()->create([
            'name' => "{$name} Admin",
            'email' => 'admin@'.str_replace(' ', '', strtolower($slug)).'.worksphere.test',
            'password' => Hash::make('password'),
            'company_id' => $company->id,
        ]);
        $adminUser->assignRole($companyAdminRole);

        $adminEmployee = Employee::factory()->create([
            'company_id' => $company->id,
            'user_id' => $adminUser->id,
            'department_id' => $engineering->id,
            'designation_id' => $engineerDesignation->id,
            'employee_code' => 'EMP-0001',
            'first_name' => 'Alex',
            'last_name' => 'Admin',
            'email' => $adminUser->email,
        ]);

        // Plain employees (no login access).
        // EMP-0002: long tenure + strong reviews -> promotion candidate.
        // EMP-0003: heavy recent overtime -> burnout risk.
        // EMP-0004: sole member of a small, overloaded department -> understaffing signal.
        $employees = collect([
            Employee::factory()->create([
                'company_id' => $company->id,
                'department_id' => $engineering->id,
                'designation_id' => $engineerDesignation->id,
                'manager_id' => $adminEmployee->id,
                'employee_code' => 'EMP-0002',
                'date_of_joining' => now()->subMonths(18)->toDateString(),
            ]),
            Employee::factory()->create([
                'company_id' => $company->id,
                'department_id' => $engineering->id,
                'designation_id' => $engineerDesignation->id,
                'manager_id' => $adminEmployee->id,
                'employee_code' => 'EMP-0003',
            ]),
            Employee::factory()->create([
                'company_id' => $company->id,
                'department_id' => $humanResources->id,
                'designation_id' => $hrDesignation->id,
                'employee_code' => 'EMP-0004',
            ]),
        ]);

        [$promotionCandidate, $burnoutCandidate, $understaffedDeptEmployee] = $employees->all();

        $engineering->update(['manager_employee_id' => $adminEmployee->id]);

        // Leave types.
        $annualLeave = LeaveType::factory()->create(['company_id' => $company->id, 'name' => 'Annual Leave', 'days_per_year' => 20]);
        LeaveType::factory()->create(['company_id' => $company->id, 'name' => 'Sick Leave', 'days_per_year' => 10]);

        // Sample attendance for today: admin + all plain employees.
        foreach ($employees->push($adminEmployee) as $emp) {
            Attendance::factory()->create([
                'company_id' => $company->id,
                'employee_id' => $emp->id,
                'date' => now()->toDateString(),
                'clock_in' => now()->setTime(9, 0),
                'clock_out' => now()->setTime(17, 30),
                'status' => 'present',
                'work_minutes' => 510,
                'source' => 'web',
            ]);
        }

        // Extra long days over the past week for the burnout candidate
        // (~74.5h total with today's record included) and moderately long
        // days for the understaffed department's sole employee (~46.5h
        // total) so the Advisor's burnout and staffing insights have real
        // data to detect.
        for ($daysAgo = 1; $daysAgo <= 6; $daysAgo++) {
            Attendance::factory()->create([
                'company_id' => $company->id,
                'employee_id' => $burnoutCandidate->id,
                'date' => now()->subDays($daysAgo)->toDateString(),
                'clock_in' => now()->subDays($daysAgo)->setTime(8, 30),
                'clock_out' => now()->subDays($daysAgo)->setTime(19, 30),
                'status' => 'present',
                'work_minutes' => 660,
                'source' => 'web',
            ]);

            Attendance::factory()->create([
                'company_id' => $company->id,
                'employee_id' => $understaffedDeptEmployee->id,
                'date' => now()->subDays($daysAgo)->toDateString(),
                'clock_in' => now()->subDays($daysAgo)->setTime(9, 0),
                'clock_out' => now()->subDays($daysAgo)->setTime(15, 20),
                'status' => 'present',
                'work_minutes' => 380,
                'source' => 'web',
            ]);
        }

        // Performance reviews: the promotion candidate has two strong recent
        // reviews, well above the eligibility threshold.
        PerformanceReview::factory()->create([
            'company_id' => $company->id,
            'employee_id' => $promotionCandidate->id,
            'reviewer_id' => $adminEmployee->id,
            'review_period' => now()->subQuarter()->format('Y').'-Q'.ceil(now()->subQuarter()->month / 3),
            'communication_rating' => 4,
            'technical_rating' => 5,
            'teamwork_rating' => 4,
            'leadership_rating' => 4,
            'overall_score' => 4.25,
            'summary' => 'Consistently strong technical delivery and reliable ownership of features.',
        ]);
        PerformanceReview::factory()->create([
            'company_id' => $company->id,
            'employee_id' => $promotionCandidate->id,
            'reviewer_id' => $adminEmployee->id,
            'review_period' => now()->format('Y').'-Q'.ceil(now()->month / 3),
            'communication_rating' => 5,
            'technical_rating' => 5,
            'teamwork_rating' => 4,
            'leadership_rating' => 5,
            'overall_score' => 4.75,
            'summary' => 'Stepped up to mentor junior engineers and led the last two releases end to end.',
        ]);

        // Payroll: last month vs this month for every login-eligible/plain
        // employee, with this month's total pushed up mainly by overtime pay
        // for the burnout candidate - enough to cross the trend threshold.
        $payrollRoster = [
            ['employee' => $adminEmployee, 'basic' => 6000],
            ['employee' => $promotionCandidate, 'basic' => 5000],
            ['employee' => $burnoutCandidate, 'basic' => 4800],
            ['employee' => $understaffedDeptEmployee, 'basic' => 4200],
        ];

        foreach ($payrollRoster as $row) {
            $basic = $row['basic'];
            $isBurnoutCandidate = $row['employee']->is($burnoutCandidate);

            $this->seedPayroll($company, $row['employee'], now()->subMonthNoOverflow(), [
                'basic_salary' => $basic,
                'allowances' => round($basic * 0.1, 2),
                'bonus' => 0,
                'overtime_pay' => 0,
                'tax' => round($basic * 0.15, 2),
                'provident_fund' => round($basic * 0.08, 2),
            ]);

            $this->seedPayroll($company, $row['employee'], now(), [
                'basic_salary' => $basic,
                'allowances' => round($basic * 0.1, 2),
                'bonus' => $isBurnoutCandidate ? 0 : round($basic * 0.04, 2),
                'overtime_pay' => $isBurnoutCandidate ? 1200 : 0,
                'tax' => round($basic * 0.155, 2),
                'provident_fund' => round($basic * 0.08, 2),
            ]);
        }
    }

    private function seedPayroll(Company $company, Employee $employee, Carbon $period, array $amounts): void
    {
        $netSalary = $amounts['basic_salary']
            + $amounts['allowances']
            + $amounts['bonus']
            + $amounts['overtime_pay']
            - $amounts['tax']
            - $amounts['provident_fund'];

        Payroll::factory()->create(array_merge($amounts, [
            'company_id' => $company->id,
            'employee_id' => $employee->id,
            'period_month' => $period->month,
            'period_year' => $period->year,
            'loan_deduction' => 0,
            'net_salary' => $netSalary,
            'status' => 'paid',
        ]));
    }
}
