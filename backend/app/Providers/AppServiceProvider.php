<?php

namespace App\Providers;

use App\Models\CompanyAnnouncement;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Policies\CompanyAnnouncementPolicy;
use App\Policies\DepartmentPolicy;
use App\Policies\EmployeePolicy;
use App\Policies\LeaveRequestPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        Gate::policy(Department::class, DepartmentPolicy::class);
        Gate::policy(Employee::class, EmployeePolicy::class);
        Gate::policy(LeaveRequest::class, LeaveRequestPolicy::class);
        Gate::policy(CompanyAnnouncement::class, CompanyAnnouncementPolicy::class);
    }
}
