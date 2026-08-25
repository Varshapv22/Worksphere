<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\EmployeeResource;
use App\Models\Employee;
use App\Models\EmployeeAsset;
use App\Models\EmployeeCertificate;
use App\Models\EmployeeDocument;
use App\Models\EmployeeNote;
use App\Models\EmployeeProject;
use App\Models\EmployeeTraining;
use Illuminate\Http\Request;

class Employee360Controller extends Controller
{
    // ─── Full 360 snapshot ──────────────────────────────────────────────────────

    public function show(Request $request, Employee $employee)
    {
        $this->authorize('view', $employee);

        // Eager-load everything the 360 view needs.
        $employee->load([
            'department',
            'designation',
            'manager',
            'leaveBalances.leaveType',
            'leaveRequests' => fn ($q) => $q->with('leaveType')->orderByDesc('created_at')->limit(10),
            'payrolls' => fn ($q) => $q->orderByDesc('period_year')->orderByDesc('period_month')->limit(12),
            'performanceReviews' => fn ($q) => $q->with('reviewer')->orderByDesc('created_at'),
            'skills',
            'notes' => fn ($q) => $q->with('author')->orderByDesc('created_at'),
            'documents' => fn ($q) => $q->orderByDesc('created_at'),
            'certificates' => fn ($q) => $q->orderByDesc('issue_date'),
            'training' => fn ($q) => $q->orderByDesc('created_at'),
            'assets' => fn ($q) => $q->orderBy('assigned_date'),
            'projects' => fn ($q) => $q->orderByDesc('start_date'),
        ]);

        $attendances = $employee->attendances()
            ->orderByDesc('date')
            ->limit(30)
            ->get();

        return response()->json([
            'employee' => new EmployeeResource($employee->loadCount(['directReports'])),

            'attendance' => [
                'recent' => $attendances->map(fn ($a) => [
                    'id'           => $a->id,
                    'date'         => $a->date->toDateString(),
                    'clock_in'     => $a->clock_in?->format('H:i'),
                    'clock_out'    => $a->clock_out?->format('H:i'),
                    'work_minutes' => $a->work_minutes,
                ]),
            ],

            'leave' => [
                'balances' => $employee->leaveBalances->map(fn ($b) => [
                    'id'         => $b->id,
                    'leave_type' => $b->leaveType?->name ?? 'Unknown',
                    'year'       => $b->year,
                    'allocated'  => (float) $b->allocated,
                    'used'       => (float) $b->used,
                    'carry_forward' => (float) $b->carry_forward,
                    'remaining'  => (float) $b->allocated + (float) $b->carry_forward - (float) $b->used,
                ]),
                'recent' => $employee->leaveRequests->map(fn ($r) => [
                    'id'         => $r->id,
                    'type'       => $r->leaveType?->name ?? 'Unknown',
                    'start_date' => $r->start_date->toDateString(),
                    'end_date'   => $r->end_date->toDateString(),
                    'days'       => $r->days,
                    'status'     => $r->status,
                    'reason'     => $r->reason,
                ]),
            ],

            'payroll' => [
                'records' => $employee->payrolls->map(fn ($p) => [
                    'id'           => $p->id,
                    'period'       => "{$p->period_year}-" . str_pad($p->period_month, 2, '0', STR_PAD_LEFT),
                    'period_month' => $p->period_month,
                    'period_year'  => $p->period_year,
                    'basic_salary' => (float) $p->basic_salary,
                    'allowances'   => (float) $p->allowances,
                    'bonus'        => (float) $p->bonus,
                    'overtime_pay' => (float) $p->overtime_pay,
                    'deductions'   => (float) $p->tax + (float) $p->provident_fund + (float) $p->loan_deduction,
                    'net_salary'   => (float) $p->net_salary,
                    'status'       => $p->status,
                ]),
            ],

            'performance' => [
                'reviews' => $employee->performanceReviews->map(fn ($r) => [
                    'id'                   => $r->id,
                    'review_period'        => $r->review_period,
                    'communication_rating' => $r->communication_rating,
                    'technical_rating'     => $r->technical_rating,
                    'teamwork_rating'      => $r->teamwork_rating,
                    'leadership_rating'    => $r->leadership_rating,
                    'overall_score'        => (float) $r->overall_score,
                    'summary'              => $r->summary,
                    'reviewer'             => $r->reviewer?->full_name,
                    'created_at'           => $r->created_at->toDateString(),
                ]),
            ],

            'skills' => $employee->skills->map(fn ($s) => [
                'id'          => $s->id,
                'name'        => $s->name,
                'category'    => $s->category,
                'proficiency' => $s->pivot->proficiency,
            ]),

            'projects'     => $employee->projects->map(fn ($p) => [
                'id'           => $p->id,
                'project_name' => $p->project_name,
                'role'         => $p->role,
                'start_date'   => $p->start_date?->toDateString(),
                'end_date'     => $p->end_date?->toDateString(),
                'status'       => $p->status,
                'created_at'   => $p->created_at->toDateString(),
            ]),

            'assets' => $employee->assets->map(fn ($a) => [
                'id'            => $a->id,
                'name'          => $a->name,
                'type'          => $a->type,
                'serial_number' => $a->serial_number,
                'assigned_date' => $a->assigned_date?->toDateString(),
                'returned_date' => $a->returned_date?->toDateString(),
            ]),

            'training' => $employee->training->map(fn ($t) => [
                'id'             => $t->id,
                'course_name'    => $t->course_name,
                'provider'       => $t->provider,
                'completed_date' => $t->completed_date?->toDateString(),
                'status'         => $t->status,
            ]),

            'certificates' => $employee->certificates->map(fn ($c) => [
                'id'          => $c->id,
                'name'        => $c->name,
                'issuer'      => $c->issuer,
                'issue_date'  => $c->issue_date?->toDateString(),
                'expiry_date' => $c->expiry_date?->toDateString(),
            ]),

            'documents' => $employee->documents->map(fn ($d) => [
                'id'         => $d->id,
                'name'       => $d->name,
                'type'       => $d->type,
                'url'        => $d->url,
                'created_at' => $d->created_at->toDateString(),
            ]),

            'notes' => $employee->notes->map(fn ($n) => [
                'id'         => $n->id,
                'body'       => $n->body,
                'type'       => $n->type,
                'author'     => $n->author?->name,
                'created_at' => $n->created_at->toDateTimeString(),
            ]),

            'timeline' => $this->buildTimeline($employee, $attendances),
        ]);
    }

    // ─── Notes ──────────────────────────────────────────────────────────────────

    public function storeNote(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'body' => ['required', 'string'],
            'type' => ['sometimes', 'in:general,hr,performance'],
        ]);

        $note = $employee->notes()->create([
            'author_id' => $request->user()->id,
            'body'      => $validated['body'],
            'type'      => $validated['type'] ?? 'general',
        ]);

        return response()->json(['data' => [
            'id'         => $note->id,
            'body'       => $note->body,
            'type'       => $note->type,
            'author'     => $request->user()->name,
            'created_at' => $note->created_at->toDateTimeString(),
        ]], 201);
    }

    public function destroyNote(Employee $employee, EmployeeNote $note)
    {
        $this->authorize('update', $employee);
        abort_if($note->employee_id !== $employee->id, 404);
        $note->delete();
        return response()->noContent();
    }

    // ─── Projects ───────────────────────────────────────────────────────────────

    public function storeProject(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'project_name' => ['required', 'string', 'max:255'],
            'role'         => ['nullable', 'string', 'max:255'],
            'start_date'   => ['nullable', 'date'],
            'end_date'     => ['nullable', 'date', 'after_or_equal:start_date'],
            'status'       => ['sometimes', 'in:active,completed,on_hold'],
        ]);

        $project = $employee->projects()->create($validated);

        return response()->json(['data' => [
            'id'           => $project->id,
            'project_name' => $project->project_name,
            'role'         => $project->role,
            'start_date'   => $project->start_date?->toDateString(),
            'end_date'     => $project->end_date?->toDateString(),
            'status'       => $project->status,
            'created_at'   => $project->created_at->toDateString(),
        ]], 201);
    }

    public function destroyProject(Employee $employee, EmployeeProject $project)
    {
        $this->authorize('update', $employee);
        abort_if($project->employee_id !== $employee->id, 404);
        $project->delete();
        return response()->noContent();
    }

    // ─── Assets ─────────────────────────────────────────────────────────────────

    public function storeAsset(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'name'          => ['required', 'string', 'max:255'],
            'type'          => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'assigned_date' => ['nullable', 'date'],
        ]);

        $asset = $employee->assets()->create($validated);

        return response()->json(['data' => [
            'id'            => $asset->id,
            'name'          => $asset->name,
            'type'          => $asset->type,
            'serial_number' => $asset->serial_number,
            'assigned_date' => $asset->assigned_date?->toDateString(),
            'returned_date' => null,
        ]], 201);
    }

    public function destroyAsset(Employee $employee, EmployeeAsset $asset)
    {
        $this->authorize('update', $employee);
        abort_if($asset->employee_id !== $employee->id, 404);
        $asset->delete();
        return response()->noContent();
    }

    // ─── Training ───────────────────────────────────────────────────────────────

    public function storeTraining(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'course_name'    => ['required', 'string', 'max:255'],
            'provider'       => ['nullable', 'string', 'max:255'],
            'completed_date' => ['nullable', 'date'],
            'status'         => ['sometimes', 'in:enrolled,completed,failed'],
        ]);

        $training = $employee->training()->create($validated);

        return response()->json(['data' => [
            'id'             => $training->id,
            'course_name'    => $training->course_name,
            'provider'       => $training->provider,
            'completed_date' => $training->completed_date?->toDateString(),
            'status'         => $training->status,
        ]], 201);
    }

    public function destroyTraining(Employee $employee, EmployeeTraining $training)
    {
        $this->authorize('update', $employee);
        abort_if($training->employee_id !== $employee->id, 404);
        $training->delete();
        return response()->noContent();
    }

    // ─── Certificates ───────────────────────────────────────────────────────────

    public function storeCertificate(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'name'        => ['required', 'string', 'max:255'],
            'issuer'      => ['nullable', 'string', 'max:255'],
            'issue_date'  => ['nullable', 'date'],
            'expiry_date' => ['nullable', 'date', 'after_or_equal:issue_date'],
        ]);

        $cert = $employee->certificates()->create($validated);

        return response()->json(['data' => [
            'id'          => $cert->id,
            'name'        => $cert->name,
            'issuer'      => $cert->issuer,
            'issue_date'  => $cert->issue_date?->toDateString(),
            'expiry_date' => $cert->expiry_date?->toDateString(),
        ]], 201);
    }

    public function destroyCertificate(Employee $employee, EmployeeCertificate $certificate)
    {
        $this->authorize('update', $employee);
        abort_if($certificate->employee_id !== $employee->id, 404);
        $certificate->delete();
        return response()->noContent();
    }

    // ─── Documents ──────────────────────────────────────────────────────────────

    public function storeDocument(Request $request, Employee $employee)
    {
        $this->authorize('update', $employee);
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['nullable', 'string', 'max:100'],
            'url'  => ['nullable', 'url', 'max:2048'],
        ]);

        $doc = $employee->documents()->create($validated);

        return response()->json(['data' => [
            'id'         => $doc->id,
            'name'       => $doc->name,
            'type'       => $doc->type,
            'url'        => $doc->url,
            'created_at' => $doc->created_at->toDateString(),
        ]], 201);
    }

    public function destroyDocument(Employee $employee, EmployeeDocument $document)
    {
        $this->authorize('update', $employee);
        abort_if($document->employee_id !== $employee->id, 404);
        $document->delete();
        return response()->noContent();
    }

    // ─── Timeline builder ───────────────────────────────────────────────────────

    private function buildTimeline(Employee $employee, $attendances): array
    {
        $events = [];

        if ($employee->date_of_joining) {
            $events[] = [
                'id'    => 'join',
                'type'  => 'joined',
                'title' => 'Joined the company',
                'description' => implode(', ', array_filter([
                    $employee->designation?->title,
                    $employee->department?->name,
                ])) ?: null,
                'date'  => $employee->date_of_joining->toDateString(),
            ];
        }

        foreach ($employee->leaveRequests as $lr) {
            $events[] = [
                'id'          => "leave_{$lr->id}",
                'type'        => "leave_{$lr->status}",
                'title'       => ucfirst($lr->status) . ' leave request',
                'description' => ($lr->leaveType?->name ?? 'Leave') . ': ' . $lr->start_date->toDateString() . ' → ' . $lr->end_date->toDateString() . " ({$lr->days} days)",
                'date'        => $lr->created_at->toDateString(),
            ];
        }

        foreach ($employee->payrolls as $p) {
            if ($p->status === 'paid') {
                $month = date('F Y', mktime(0, 0, 0, $p->period_month, 1, $p->period_year));
                $events[] = [
                    'id'          => "payroll_{$p->id}",
                    'type'        => 'payroll',
                    'title'       => "Salary processed — {$month}",
                    'description' => 'Net: ' . number_format((float) $p->net_salary, 0),
                    'date'        => "{$p->period_year}-" . str_pad($p->period_month, 2, '0', STR_PAD_LEFT) . '-01',
                ];
            }
        }

        foreach ($employee->performanceReviews as $pr) {
            $events[] = [
                'id'          => "perf_{$pr->id}",
                'type'        => 'performance',
                'title'       => "Performance review: {$pr->review_period}",
                'description' => "Overall score: {$pr->overall_score}/5" . ($pr->reviewer ? " · Reviewed by {$pr->reviewer->full_name}" : ''),
                'date'        => $pr->created_at->toDateString(),
            ];
        }

        foreach ($employee->skills as $s) {
            $events[] = [
                'id'          => "skill_{$s->id}",
                'type'        => 'skill',
                'title'       => "Skill recorded: {$s->name}",
                'description' => "Proficiency level {$s->pivot->proficiency}/5",
                'date'        => $s->pivot->created_at->toDateString(),
            ];
        }

        foreach ($employee->projects as $p) {
            $events[] = [
                'id'          => "project_{$p->id}",
                'type'        => 'project',
                'title'       => "Project: {$p->project_name}",
                'description' => implode(' · ', array_filter([$p->role, ucfirst($p->status)])) ?: null,
                'date'        => $p->start_date?->toDateString() ?? $p->created_at->toDateString(),
            ];
        }

        foreach ($employee->assets as $a) {
            $events[] = [
                'id'          => "asset_{$a->id}",
                'type'        => 'asset',
                'title'       => "Asset assigned: {$a->name}",
                'description' => $a->serial_number ? "SN: {$a->serial_number}" : $a->type,
                'date'        => $a->assigned_date?->toDateString() ?? $a->created_at->toDateString(),
            ];
        }

        foreach ($employee->training as $t) {
            $status = $t->status === 'completed' ? 'Completed' : 'Enrolled in';
            $events[] = [
                'id'          => "training_{$t->id}",
                'type'        => 'training',
                'title'       => "{$status} training: {$t->course_name}",
                'description' => $t->provider,
                'date'        => $t->completed_date?->toDateString() ?? $t->created_at->toDateString(),
            ];
        }

        foreach ($employee->certificates as $c) {
            $events[] = [
                'id'          => "cert_{$c->id}",
                'type'        => 'certificate',
                'title'       => "Certificate earned: {$c->name}",
                'description' => $c->issuer ? "Issued by {$c->issuer}" : null,
                'date'        => $c->issue_date?->toDateString() ?? $c->created_at->toDateString(),
            ];
        }

        foreach ($employee->notes as $n) {
            $preview = mb_strlen($n->body) > 80 ? mb_substr($n->body, 0, 80) . '…' : $n->body;
            $events[] = [
                'id'          => "note_{$n->id}",
                'type'        => 'note',
                'title'       => ucfirst($n->type) . ' note added',
                'description' => $preview,
                'date'        => $n->created_at->toDateString(),
            ];
        }

        usort($events, fn ($a, $b) => strcmp($b['date'], $a['date']));

        return array_values($events);
    }
}
