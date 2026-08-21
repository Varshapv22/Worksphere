<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminModuleResource;
use App\Models\AdminActivityLog;
use App\Models\Module;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class ModuleController extends Controller
{
    public function index()
    {
        $modules = Module::withCount(['companies as enabled_company_count' => function ($query) {
            $query->where('company_module.is_enabled', true);
        }])
            ->orderBy('sort_order')
            ->orderBy('name')
            ->get();

        return AdminModuleResource::collection($modules);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $module = Module::create($validated)->fresh();

        AdminActivityLog::record('module.create', $module, ['after' => $validated], $module->name);

        return new AdminModuleResource($module->loadCount(['companies as enabled_company_count' => function ($query) {
            $query->where('company_module.is_enabled', true);
        }]));
    }

    public function update(Request $request, Module $module)
    {
        $validated = $this->validated($request, $module->id);

        $before = $module->only(array_keys($validated));
        $module->update($validated);

        AdminActivityLog::record('module.update', $module, ['before' => $before, 'after' => $validated], $module->name);

        return new AdminModuleResource($module->fresh()->loadCount(['companies as enabled_company_count' => function ($query) {
            $query->where('company_module.is_enabled', true);
        }]));
    }

    public function destroy(Module $module)
    {
        if ($module->companies()->wherePivot('is_enabled', true)->exists()) {
            throw ValidationException::withMessages([
                'module' => 'This module is enabled by companies and cannot be deleted.',
            ]);
        }

        $name = $module->name;
        $module->delete();

        AdminActivityLog::record('module.delete', $module, [], $name);

        return response()->noContent();
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('modules', 'slug')->ignore($ignoreId)],
            'description' => ['nullable', 'string'],
            'icon' => ['nullable', 'string', 'max:100'],
            'category' => ['nullable', 'string', 'max:100'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
            'is_active' => ['sometimes', 'boolean'],
            'is_available' => ['sometimes', 'boolean'],
        ]);
    }
}
