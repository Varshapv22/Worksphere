<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDepartmentRequest;
use App\Http\Requests\UpdateDepartmentRequest;
use App\Http\Resources\DepartmentResource;
use App\Models\Department;
use Illuminate\Http\Request;

class DepartmentController extends Controller
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', Department::class);

        if ($request->boolean('tree')) {
            $departments = Department::query()
                ->whereNull('parent_department_id')
                ->with('children.children', 'manager')
                ->get();

            return DepartmentResource::collection($departments);
        }

        $departments = Department::query()
            ->withCount('employees')
            ->with('parent', 'manager')
            ->paginate($request->integer('per_page', 15));

        return DepartmentResource::collection($departments);
    }

    public function store(StoreDepartmentRequest $request)
    {
        $department = Department::create($request->validated());

        return new DepartmentResource($department->fresh(['parent', 'manager']));
    }

    public function show(Department $department)
    {
        $this->authorize('view', $department);

        return new DepartmentResource($department->load('parent', 'manager', 'children'));
    }

    public function update(UpdateDepartmentRequest $request, Department $department)
    {
        $department->update($request->validated());

        return new DepartmentResource($department->fresh(['parent', 'manager']));
    }

    public function destroy(Department $department)
    {
        $this->authorize('delete', $department);

        $department->delete();

        return response()->json(null, 204);
    }
}
