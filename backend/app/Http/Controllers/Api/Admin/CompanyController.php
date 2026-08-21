<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminCompanyResource;
use App\Models\AdminActivityLog;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyController extends Controller
{
    /**
     * Every tenant on the platform, with headcount and plan usage.
     */
    public function index(Request $request)
    {
        $query = Company::withCount('employees')->with('subscriptionPlan');

        if ($request->filled('status')) {
            $query->where('is_active', $request->string('status') === 'active');
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn ($q) => $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%"));
        }

        $companies = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 15));

        return AdminCompanyResource::collection($companies);
    }

    public function show(Company $company)
    {
        $company->loadCount('employees')->load('subscriptionPlan');

        return new AdminCompanyResource($company);
    }

    /**
     * Suspend/reactivate a tenant, or move it to a different plan.
     */
    public function update(Request $request, Company $company)
    {
        $validated = $request->validate([
            'is_active' => ['sometimes', 'boolean'],
            'subscription_plan_id' => ['sometimes', 'nullable', Rule::exists('subscription_plans', 'id')],
        ]);

        $before = $company->only(array_keys($validated));
        $company->update($validated);

        AdminActivityLog::record('company.update', $company, ['before' => $before, 'after' => $validated], $company->name);

        return new AdminCompanyResource($company->fresh()->loadCount('employees')->load('subscriptionPlan'));
    }

    /**
     * Approve a pending (or previously rejected) company registration,
     * letting its admin sign in.
     */
    public function approve(Company $company)
    {
        $before = $company->status;
        $company->update(['status' => 'approved', 'is_active' => true]);

        AdminActivityLog::record('company.approve', $company, ['before' => ['status' => $before], 'after' => ['status' => 'approved']], $company->name);

        return new AdminCompanyResource($company->fresh()->loadCount('employees')->load('subscriptionPlan'));
    }

    /**
     * Reject a pending company registration - its users cannot sign in.
     */
    public function reject(Company $company)
    {
        $before = $company->status;
        $company->update(['status' => 'rejected']);

        AdminActivityLog::record('company.reject', $company, ['before' => ['status' => $before], 'after' => ['status' => 'rejected']], $company->name);

        return new AdminCompanyResource($company->fresh()->loadCount('employees')->load('subscriptionPlan'));
    }
}
