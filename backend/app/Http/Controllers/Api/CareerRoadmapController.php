<?php

namespace App\Http\Controllers\Api;

use App\Models\CareerTrack;
use App\Models\EmployeeCareerTrack;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CareerRoadmapController extends Controller
{
    // ── Career Tracks ─────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $tracks = CareerTrack::where('company_id', $request->user()->company_id)
            ->where('is_active', true)
            ->with('steps')
            ->orderBy('sort_order')
            ->get()
            ->map(fn (CareerTrack $t) => $this->trackResource($t));

        return response()->json(['data' => $tracks]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'target_role' => ['required', 'string', 'max:255'],
            'steps'       => ['nullable', 'array'],
            'steps.*.title'           => ['required', 'string', 'max:255'],
            'steps.*.description'     => ['nullable', 'string'],
            'steps.*.skills_required' => ['nullable', 'array'],
            'steps.*.resources'       => ['nullable', 'array'],
        ]);

        $track = CareerTrack::create([
            'company_id'  => $request->user()->company_id,
            'title'       => $data['title'],
            'description' => $data['description'] ?? null,
            'target_role' => $data['target_role'],
        ]);

        foreach ($data['steps'] ?? [] as $index => $stepData) {
            $track->steps()->create([
                'title'           => $stepData['title'],
                'description'     => $stepData['description'] ?? null,
                'skills_required' => $stepData['skills_required'] ?? [],
                'resources'       => $stepData['resources'] ?? [],
                'sort_order'      => $index,
            ]);
        }

        $track->load('steps');

        return response()->json(['data' => $this->trackResource($track)], 201);
    }

    public function show(Request $request, CareerTrack $careerTrack): JsonResponse
    {
        $careerTrack->load('steps');

        // Include enrollments with employee info
        $enrollments = EmployeeCareerTrack::where('career_track_id', $careerTrack->id)
            ->with('employee:id,first_name,last_name,designation_id', 'employee.designation:id,title')
            ->get()
            ->map(fn ($e) => $this->enrollmentResource($e));

        return response()->json([
            'data' => array_merge($this->trackResource($careerTrack), ['enrollments' => $enrollments]),
        ]);
    }

    public function update(Request $request, CareerTrack $careerTrack): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'target_role' => ['sometimes', 'string', 'max:255'],
            'is_active'   => ['sometimes', 'boolean'],
        ]);

        $careerTrack->update($data);
        $careerTrack->load('steps');

        return response()->json(['data' => $this->trackResource($careerTrack)]);
    }

    public function destroy(CareerTrack $careerTrack): JsonResponse
    {
        $careerTrack->delete();
        return response()->json(null, 204);
    }

    // ── Employee Enrollments ──────────────────────────────────────────────────

    public function enroll(Request $request, CareerTrack $careerTrack): JsonResponse
    {
        $data = $request->validate([
            'employee_id' => ['required', 'integer', 'exists:employees,id'],
        ]);

        $enrollment = EmployeeCareerTrack::updateOrCreate(
            ['employee_id' => $data['employee_id'], 'career_track_id' => $careerTrack->id],
            ['company_id' => $request->user()->company_id, 'started_at' => now(), 'current_step' => 0]
        );

        $enrollment->load('employee:id,first_name,last_name', 'track');

        return response()->json(['data' => $this->enrollmentResource($enrollment)], 201);
    }

    public function updateProgress(Request $request, \App\Models\EmployeeCareerTrack $employeeCareerTrack): JsonResponse
    {
        $data = $request->validate([
            'current_step' => ['required', 'integer', 'min:0'],
        ]);

        $employeeCareerTrack->load('track.steps');
        $totalSteps = $employeeCareerTrack->track->steps()->count();
        $employeeCareerTrack->current_step = min($data['current_step'], $totalSteps);
        if ($employeeCareerTrack->current_step >= $totalSteps && $totalSteps > 0) {
            $employeeCareerTrack->completed_at = $employeeCareerTrack->completed_at ?? now();
        }
        $employeeCareerTrack->save();

        return response()->json(['data' => $this->enrollmentResource($employeeCareerTrack)]);
    }

    public function myRoadmap(Request $request): JsonResponse
    {
        $enrollments = EmployeeCareerTrack::where('company_id', $request->user()->company_id)
            ->with('track.steps')
            ->get()
            ->map(fn ($e) => $this->enrollmentResource($e, true));

        return response()->json(['data' => $enrollments]);
    }

    // ── Resources ────────────────────────────────────────────────────────────

    private function trackResource(CareerTrack $t): array
    {
        return [
            'id'          => $t->id,
            'title'       => $t->title,
            'description' => $t->description,
            'target_role' => $t->target_role,
            'is_active'   => $t->is_active,
            'sort_order'  => $t->sort_order,
            'steps'       => $t->steps->map(fn ($s) => [
                'id'              => $s->id,
                'title'           => $s->title,
                'description'     => $s->description,
                'skills_required' => $s->skills_required ?? [],
                'resources'       => $s->resources ?? [],
                'sort_order'      => $s->sort_order,
            ])->values(),
            'created_at'  => $t->created_at?->toIso8601String(),
        ];
    }

    private function enrollmentResource(EmployeeCareerTrack $e, bool $includeTrack = false): array
    {
        $res = [
            'id'           => $e->id,
            'employee_id'  => $e->employee_id,
            'employee'     => $e->employee ? [
                'id'          => $e->employee->id,
                'full_name'   => $e->employee->full_name,
                'designation' => $e->employee->designation?->title,
            ] : null,
            'current_step' => $e->current_step,
            'started_at'   => $e->started_at?->toIso8601String(),
            'completed_at' => $e->completed_at?->toIso8601String(),
        ];

        if ($includeTrack && $e->track) {
            $res['track'] = $this->trackResource($e->track);
        } else {
            $res['career_track_id'] = $e->career_track_id;
        }

        return $res;
    }
}
