<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\Company;
use App\Models\Department;
use App\Models\Designation;
use App\Models\Employee;
use App\Models\LeaveType;
use App\Models\SubscriptionPlan;
use App\Models\User;
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
        ]);

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
        $employees = collect([
            Employee::factory()->create([
                'company_id' => $company->id,
                'department_id' => $engineering->id,
                'designation_id' => $engineerDesignation->id,
                'manager_id' => $adminEmployee->id,
                'employee_code' => 'EMP-0002',
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
    }
}
