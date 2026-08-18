<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminCompanyModuleResource;
use App\Models\Company;
use App\Models\Module;
use Illuminate\Http\Request;

class CompanyModuleController extends Controller
{
    /**
     * The full catalog with this company's grant/enabled state for each module.
     */
    public function index(Company $company)
    {
        $pivotByModuleId = $company->modules()->get()->keyBy('id');

        $modules = Module::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->each(function (Module $module) use ($pivotByModuleId) {
                $pivot = $pivotByModuleId->get($module->id)?->pivot;
                $module->is_enabled = (bool) ($pivot->is_enabled ?? false);
                $module->is_granted = $pivot === null ? true : (bool) $pivot->is_granted;
            });

        return AdminCompanyModuleResource::collection($modules);
    }

    /**
     * Grant or revoke a company's access to a module. Revoking also turns
     * the module off for them - a company can't keep using something the
     * platform just told them they no longer have.
     */
    public function update(Request $request, Company $company, Module $module)
    {
        $validated = $request->validate([
            'is_granted' => ['required', 'boolean'],
        ]);

        $isGranted = $validated['is_granted'];

        $company->modules()->syncWithoutDetaching([
            $module->id => array_merge(
                ['is_granted' => $isGranted],
                $isGranted ? [] : ['is_enabled' => false, 'enabled_at' => null]
            ),
        ]);

        $pivot = $company->modules()->find($module->id)?->pivot;
        $module->is_enabled = (bool) ($pivot->is_enabled ?? false);
        $module->is_granted = $isGranted;

        return new AdminCompanyModuleResource($module);
    }
}
