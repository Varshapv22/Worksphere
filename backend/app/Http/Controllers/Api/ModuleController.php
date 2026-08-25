<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ModuleResource;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class ModuleController extends Controller
{
    /**
     * List the marketplace catalog with each module's enabled state for the
     * current company.
     */
    public function index(Request $request)
    {
        $company = $request->user()->company;

        $enabledByModuleId = $company->modules()->get()->keyBy('id');

        $modules = Module::where('is_active', true)
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get()
            ->each(function (Module $module) use ($enabledByModuleId) {
                $pivot = $enabledByModuleId->get($module->id)?->pivot;
                $module->is_enabled = (bool) ($pivot->is_enabled ?? false);
                $module->enabled_at = $pivot->enabled_at ?? null;
                // No pivot row yet = never curated by a super admin = granted by default.
                $module->is_granted = $pivot === null ? true : (bool) $pivot->is_granted;
                $module->company_sort_order = $pivot->sort_order ?? null;
            })
            // The super admin's custom order for this company (set by dragging
            // in the Kanban board) wins over the platform-wide catalog order.
            ->sortBy([
                fn (Module $a, Module $b) => ($a->company_sort_order ?? $a->sort_order) <=> ($b->company_sort_order ?? $b->sort_order),
                fn (Module $a, Module $b) => $a->name <=> $b->name,
            ])
            ->values();

        return ModuleResource::collection($modules);
    }

    /**
     * Enable or disable a module for the current company.
     */
    public function toggle(Request $request, Module $module)
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage modules.');

        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        if (! $module->is_active || ! $module->is_available) {
            throw ValidationException::withMessages([
                'module' => 'This module is not yet available to enable.',
            ]);
        }

        $company = $request->user()->company;

        if (! $company->hasModuleGranted($module->slug)) {
            throw ValidationException::withMessages([
                'module' => 'This module is not included in your plan. Contact your account manager.',
            ]);
        }

        $isEnabled = $validated['is_enabled'];

        $company->modules()->syncWithoutDetaching([
            $module->id => [
                'is_enabled' => $isEnabled,
                'enabled_at' => $isEnabled ? now() : null,
            ],
        ]);

        $module->is_enabled = $isEnabled;
        $module->enabled_at = $isEnabled ? now() : null;
        $module->is_granted = true;

        return new ModuleResource($module);
    }
}
