<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\UpdateCompanyRequest;
use App\Http\Resources\CompanyResource;
use Illuminate\Http\Request;

class CompanyController extends Controller
{
    /**
     * Show the current tenant's company profile.
     */
    public function show(Request $request)
    {
        $company = $request->user()->company()->with('subscriptionPlan')->firstOrFail();

        return new CompanyResource($company);
    }

    /**
     * Update the current tenant's company profile/settings (company-admin only).
     */
    public function update(UpdateCompanyRequest $request)
    {
        $company = $request->user()->company()->firstOrFail();

        $company->update($request->validated());

        return new CompanyResource($company->fresh('subscriptionPlan'));
    }
}
