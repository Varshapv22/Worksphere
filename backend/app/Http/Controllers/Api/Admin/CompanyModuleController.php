<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminCompanyModuleResource;
use App\Models\AdminActivityLog;
use App\Models\Company;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CompanyModuleController extends Controller
{
    /**
     * The full catalog with this company's grant/enabled state for each
     * module, ordered by this company's custom order where one has been
     * set, falling back to the platform-wide catalog order.
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
                $module->company_sort_order = $pivot->sort_order ?? null;
            })
            ->sortBy([
                fn (Module $a, Module $b) => ($a->company_sort_order ?? $a->sort_order) <=> ($b->company_sort_order ?? $b->sort_order),
                fn (Module $a, Module $b) => $a->name <=> $b->name,
            ])
            ->values();

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
        $wasGranted = (bool) ($company->modules()->find($module->id)?->pivot->is_granted ?? true);

        $company->modules()->syncWithoutDetaching([
            $module->id => array_merge(
                ['is_granted' => $isGranted],
                $isGranted ? [] : ['is_enabled' => false, 'enabled_at' => null]
            ),
        ]);

        $pivot = $company->modules()->find($module->id)?->pivot;
        $module->is_enabled = (bool) ($pivot->is_enabled ?? false);
        $module->is_granted = $isGranted;

        AdminActivityLog::record(
            $isGranted ? 'company_module.grant' : 'company_module.revoke',
            $company,
            ['module' => $module->slug, 'before' => ['is_granted' => $wasGranted], 'after' => ['is_granted' => $isGranted]],
            "{$company->name} — {$module->name}"
        );

        return new AdminCompanyModuleResource($module);
    }

    /**
     * Persist this company's custom display order for a set of modules
     * (e.g. the modules currently active in their Kanban lane), in the
     * order given.
     */
    public function reorder(Request $request, Company $company)
    {
        $validated = $request->validate([
            'module_ids' => ['required', 'array', 'min:1'],
            'module_ids.*' => ['integer', Rule::exists('modules', 'id')],
        ]);

        foreach (array_values($validated['module_ids']) as $index => $moduleId) {
            $company->modules()->syncWithoutDetaching([
                $moduleId => ['sort_order' => $index],
            ]);
        }

        return response()->noContent();
    }
}
