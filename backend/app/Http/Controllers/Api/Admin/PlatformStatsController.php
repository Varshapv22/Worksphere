<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Company;
use App\Models\Employee;
use App\Models\User;

class PlatformStatsController extends Controller
{
    private const NEAR_LIMIT_THRESHOLD_PERCENT = 80;

    /**
     * Platform-wide analytics for the super-admin dashboard: how many
     * tenants are on the platform, revenue, and who is approaching their
     * plan's employee limit ("monitor usage").
     */
    public function index()
    {
        $companies = Company::query()->with('subscriptionPlan')->withCount('employees')->get();

        $mrr = $companies
            ->where('is_active', true)
            ->sum(fn (Company $company) => (float) ($company->subscriptionPlan?->price_monthly ?? 0));

        $nearLimit = $companies
            ->filter(function (Company $company) {
                $max = $company->subscriptionPlan?->max_employees ?? 0;

                return $max > 0 && ($company->employees_count / $max) * 100 >= self::NEAR_LIMIT_THRESHOLD_PERCENT;
            })
            ->map(fn (Company $company) => [
                'id' => $company->id,
                'name' => $company->name,
                'employee_count' => $company->employees_count,
                'max_employees' => $company->subscriptionPlan?->max_employees,
                'usage_percent' => round(($company->employees_count / $company->subscriptionPlan->max_employees) * 100, 1),
            ])
            ->sortByDesc('usage_percent')
            ->values();

        return response()->json([
            'companies' => [
                'total' => $companies->count(),
                'pending' => $companies->where('status', 'pending')->count(),
                'active' => $companies->where('status', 'approved')->where('is_active', true)->count(),
                'suspended' => $companies->where('status', 'approved')->where('is_active', false)->count(),
                'rejected' => $companies->where('status', 'rejected')->count(),
                'on_trial' => $companies->filter(fn (Company $c) => $c->trial_ends_at && $c->trial_ends_at->isFuture())->count(),
                'new_this_month' => $companies->filter(fn (Company $c) => $c->created_at->isCurrentMonth())->count(),
            ],
            'employees' => [
                'total' => Employee::count(),
            ],
            'users' => [
                'total' => User::whereNotNull('company_id')->count(),
            ],
            'revenue' => [
                'mrr' => round($mrr, 2),
                'arr' => round($mrr * 12, 2),
            ],
            'companies_near_limit' => $nearLimit,
        ]);
    }
}
