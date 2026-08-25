<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrgChartController extends Controller
{
    public function index(): JsonResponse
    {
        $employees = Employee::with([
            'designation:id,title',
            'department:id,name',
        ])->get(['id', 'first_name', 'last_name', 'email', 'employee_code', 'employment_status', 'manager_id', 'designation_id', 'department_id']);

        // Build flat map
        $nodeMap = [];
        foreach ($employees as $emp) {
            $nodeMap[$emp->id] = [
                'id'                => $emp->id,
                'full_name'         => $emp->full_name,
                'email'             => $emp->email,
                'employee_code'     => $emp->employee_code,
                'employment_status' => $emp->employment_status,
                'manager_id'        => $emp->manager_id,
                'designation'       => $emp->designation
                    ? ['id' => $emp->designation->id, 'title' => $emp->designation->title]
                    : null,
                'department'        => $emp->department
                    ? ['id' => $emp->department->id, 'name' => $emp->department->name]
                    : null,
                'children'          => [],
            ];
        }

        // Attach children ids and collect roots
        $roots = [];
        foreach ($nodeMap as $id => &$node) {
            $mid = $node['manager_id'];
            if ($mid && isset($nodeMap[$mid])) {
                $nodeMap[$mid]['children'][] = $id;
            } else {
                $roots[] = $id;
            }
        }
        unset($node);

        // Recursive builder
        $build = function (int $id) use (&$build, &$nodeMap): array {
            $n = $nodeMap[$id];
            $n['children'] = array_values(array_map(fn ($cid) => $build($cid), $n['children']));
            return $n;
        };

        return response()->json([
            'data'  => array_values(array_map(fn ($id) => $build($id), $roots)),
            'total' => count($nodeMap),
        ]);
    }

    public function updateManager(Employee $employee, Request $request): JsonResponse
    {
        $this->authorize('update', $employee);

        $validated = $request->validate([
            'manager_id' => 'nullable|integer',
        ]);

        $newManagerId = $validated['manager_id'] ?? null;

        if ($newManagerId !== null) {
            // Ensure proposed manager belongs to the same tenant
            if (! Employee::where('id', $newManagerId)->where('company_id', $employee->company_id)->exists()) {
                return response()->json(['message' => 'Manager not found.'], 422);
            }

            // Prevent circular hierarchy — walk up from new manager
            $cursor = $newManagerId;
            $seen   = [];
            while ($cursor) {
                if ($cursor === $employee->id) {
                    return response()->json(['message' => 'Cannot create a circular reporting structure.'], 422);
                }
                if (isset($seen[$cursor])) {
                    break;
                }
                $seen[$cursor] = true;
                $cursor = Employee::find($cursor)?->manager_id;
            }
        }

        $employee->update(['manager_id' => $newManagerId]);

        return response()->json(['message' => 'Reporting line updated successfully.']);
    }
}
