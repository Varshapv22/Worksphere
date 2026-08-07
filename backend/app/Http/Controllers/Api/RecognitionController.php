<?php

namespace App\Http\Controllers\Api;

use App\Models\Badge;
use App\Models\Employee;
use App\Models\EmployeeRecognition;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class RecognitionController extends Controller
{
    public function badges(): JsonResponse
    {
        $badges = Badge::where('is_active', true)->orderBy('id')->get();

        return response()->json(['data' => $badges]);
    }

    public function index(Request $request): JsonResponse
    {
        $query = EmployeeRecognition::with([
            'employee:id,first_name,last_name,designation_id',
            'employee.designation:id,title',
            'awardedBy:id,name',
            'badge',
        ])->orderByDesc('created_at');

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        $recognitions = $query->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => $recognitions->map(fn (EmployeeRecognition $r) => $this->toResource($r)),
            'meta' => [
                'current_page' => $recognitions->currentPage(),
                'last_page'    => $recognitions->lastPage(),
                'total'        => $recognitions->total(),
                'per_page'     => $recognitions->perPage(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
            'badge_id'    => ['required', 'integer', 'exists:badges,id'],
            'message'     => ['nullable', 'string', 'max:500'],
        ]);

        // Ensure the target employee belongs to the same tenant
        $employee = Employee::find($data['employee_id']);
        if (! $employee) {
            return response()->json(['message' => 'Employee not found.'], 422);
        }

        $recognition = EmployeeRecognition::create([
            'company_id'    => $request->user()->company_id,
            'employee_id'   => $data['employee_id'],
            'awarded_by_id' => $request->user()->id,
            'badge_id'      => $data['badge_id'],
            'message'       => $data['message'] ?? null,
        ]);

        $recognition->load([
            'employee:id,first_name,last_name,designation_id',
            'employee.designation:id,title',
            'awardedBy:id,name',
            'badge',
        ]);

        return response()->json(['data' => $this->toResource($recognition)], 201);
    }

    public function destroy(EmployeeRecognition $recognition): JsonResponse
    {
        $recognition->delete();

        return response()->json(null, 204);
    }

    private function toResource(EmployeeRecognition $r): array
    {
        return [
            'id'         => $r->id,
            'employee'   => $r->employee ? [
                'id'          => $r->employee->id,
                'full_name'   => $r->employee->full_name,
                'designation' => $r->employee->designation?->title,
            ] : null,
            'awarded_by' => $r->awardedBy ? [
                'id'   => $r->awardedBy->id,
                'name' => $r->awardedBy->name,
            ] : null,
            'badge'      => $r->badge ? [
                'id'          => $r->badge->id,
                'name'        => $r->badge->name,
                'emoji'       => $r->badge->emoji,
                'description' => $r->badge->description,
                'color'       => $r->badge->color,
            ] : null,
            'message'    => $r->message,
            'created_at' => $r->created_at?->toIso8601String(),
        ];
    }
}
