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
            });

        return ModuleResource::collection($modules);
    }

    /**
     * Enable or disable a module for the current company.
     */
    public function toggle(Request $request, Module $module)
    {
        $validated = $request->validate([
            'is_enabled' => ['required', 'boolean'],
        ]);

        if (! $module->is_active || ! $module->is_available) {
            throw ValidationException::withMessages([
                'module' => 'This module is not yet available to enable.',
            ]);
        }

        $company = $request->user()->company;
        $isEnabled = $validated['is_enabled'];

        $company->modules()->syncWithoutDetaching([
            $module->id => [
                'is_enabled' => $isEnabled,
                'enabled_at' => $isEnabled ? now() : null,
            ],
        ]);

        $module->is_enabled = $isEnabled;
        $module->enabled_at = $isEnabled ? now() : null;

        return new ModuleResource($module);
    }
}
