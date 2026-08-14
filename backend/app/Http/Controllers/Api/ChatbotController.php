<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;

class ChatbotController extends Controller
{
    private const MODEL = 'gemini-3.5-flash';

    private const MAX_TOOL_ROUNDS = 4;

    public function ask(Request $request)
    {
        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'history' => ['sometimes', 'array', 'max:20'],
            'history.*.role' => ['required_with:history', 'in:user,model'],
            'history.*.text' => ['required_with:history', 'string'],
        ]);

        $apiKey = config('services.gemini.key');

        if (empty($apiKey)) {
            return response()->json([
                'message' => 'Gemini API key is not configured. Please set GEMINI_API_KEY in your environment. Get a free key at https://aistudio.google.com/app/apikey',
            ], 500);
        }

        $company = $request->user()->company;

        $contents = [];
        foreach ($validated['history'] ?? [] as $turn) {
            $contents[] = ['role' => $turn['role'], 'parts' => [['text' => $turn['text']]]];
        }
        $contents[] = ['role' => 'user', 'parts' => [['text' => $validated['message']]]];

        $toolCallLog = [];

        for ($round = 0; $round < self::MAX_TOOL_ROUNDS; $round++) {
            $response = Http::timeout(30)->post(
                'https://generativelanguage.googleapis.com/v1beta/models/'.self::MODEL.':generateContent?key='.$apiKey,
                [
                    'system_instruction' => ['parts' => [['text' => $this->systemInstruction($company?->name ?? 'your company')]]],
                    'contents' => $contents,
                    'tools' => [['functionDeclarations' => $this->toolDeclarations()]],
                    'generationConfig' => [
                        'temperature' => 0.2,
                        'maxOutputTokens' => 1024,
                    ],
                ]
            );

            if ($response->failed()) {
                return response()->json(['message' => 'AI request failed: '.$response->body()], 502);
            }

            $parts = $response->json('candidates.0.content.parts', []);
            $functionCalls = array_values(array_filter($parts, fn ($p) => isset($p['functionCall'])));

            if (empty($functionCalls)) {
                $text = collect($parts)->pluck('text')->filter()->implode('');

                return response()->json([
                    'reply' => $text !== '' ? $text : "I couldn't find an answer to that.",
                    'tool_calls' => $toolCallLog,
                ]);
            }

            $modelParts = array_map(function (array $call) {
                if (empty($call['functionCall']['args'])) {
                    $call['functionCall']['args'] = new \stdClass;
                }

                return $call;
            }, $functionCalls);
            $contents[] = ['role' => 'model', 'parts' => $modelParts];

            $responseParts = [];
            foreach ($functionCalls as $call) {
                $name = $call['functionCall']['name'];
                $args = $call['functionCall']['args'] ?? [];
                $result = $this->executeTool($name, $args);
                $toolCallLog[] = ['name' => $name, 'args' => $args];

                $functionResponse = ['name' => $name, 'response' => ['result' => $result]];
                if (isset($call['functionCall']['id'])) {
                    $functionResponse['id'] = $call['functionCall']['id'];
                }
                $responseParts[] = ['functionResponse' => $functionResponse];
            }
            $contents[] = ['role' => 'user', 'parts' => $responseParts];
        }

        return response()->json(['message' => 'The assistant could not complete the request.'], 500);
    }

    private function systemInstruction(string $companyName): string
    {
        $today = Carbon::today()->toDateString();

        return <<<TEXT
You are the WorkSphere HR Assistant for {$companyName}. Today's date is {$today}.

Answer questions about employees, attendance, and leave using ONLY the provided tool functions — never guess, estimate, or invent names, dates, or numbers. Always call the relevant tool(s) before answering any question about specific employees, attendance, or leave. If a tool returns an empty list, say so plainly (e.g. "No one is on leave today"). List employee names and relevant details clearly. Keep answers concise and conversational, suitable for being read aloud by text-to-speech. If the question has nothing to do with employee/HR data, answer briefly and helpfully without fabricating company data.
TEXT;
    }

    private function toolDeclarations(): array
    {
        $dateParam = [
            'type' => 'object',
            'properties' => [
                'date' => [
                    'type' => 'string',
                    'description' => 'ISO date (YYYY-MM-DD). Defaults to today if omitted.',
                ],
            ],
        ];

        return [
            [
                'name' => 'get_employees_on_leave',
                'description' => 'List employees on approved leave for a given date (defaults to today).',
                'parameters' => $dateParam,
            ],
            [
                'name' => 'get_late_employees',
                'description' => 'List employees marked late for a given date (defaults to today).',
                'parameters' => $dateParam,
            ],
            [
                'name' => 'get_absent_employees',
                'description' => 'List employees marked absent for a given date (defaults to today).',
                'parameters' => $dateParam,
            ],
            [
                'name' => 'get_present_employees',
                'description' => 'List employees who are present (or half-day) for a given date (defaults to today).',
                'parameters' => $dateParam,
            ],
            [
                'name' => 'get_pending_leave_requests',
                'description' => 'List all leave requests currently pending approval.',
                'parameters' => ['type' => 'object', 'properties' => new \stdClass],
            ],
            [
                'name' => 'get_headcount',
                'description' => 'Count active employees, optionally filtered by department name.',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'department' => [
                            'type' => 'string',
                            'description' => 'Department name to filter by (optional).',
                        ],
                    ],
                ],
            ],
            [
                'name' => 'get_employee_info',
                'description' => "Look up a specific employee's details (department, designation, manager, join date, today's attendance/leave status) by name.",
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'name' => [
                            'type' => 'string',
                            'description' => "The employee's full or partial name.",
                        ],
                    ],
                    'required' => ['name'],
                ],
            ],
        ];
    }

    private function executeTool(string $name, array $args): array
    {
        $date = ! empty($args['date'])
            ? Carbon::parse($args['date'])->toDateString()
            : Carbon::today()->toDateString();

        return match ($name) {
            'get_employees_on_leave' => $this->employeesOnLeave($date),
            'get_late_employees' => $this->attendanceByStatus($date, ['late']),
            'get_absent_employees' => $this->attendanceByStatus($date, ['absent']),
            'get_present_employees' => $this->attendanceByStatus($date, ['present', 'half_day']),
            'get_pending_leave_requests' => $this->pendingLeaveRequests(),
            'get_headcount' => $this->headcount($args['department'] ?? null),
            'get_employee_info' => $this->employeeInfo($args['name'] ?? ''),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    private function employeesOnLeave(string $date): array
    {
        return LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->with(['employee.department', 'leaveType'])
            ->get()
            ->map(fn (LeaveRequest $lr) => [
                'name' => $lr->employee?->full_name,
                'department' => $lr->employee?->department?->name,
                'leave_type' => $lr->leaveType?->name,
                'start_date' => $lr->start_date?->toDateString(),
                'end_date' => $lr->end_date?->toDateString(),
            ])
            ->values()
            ->all();
    }

    private function attendanceByStatus(string $date, array $statuses): array
    {
        return Attendance::query()
            ->whereDate('date', $date)
            ->whereIn('status', $statuses)
            ->with('employee.department')
            ->get()
            ->map(fn (Attendance $a) => [
                'name' => $a->employee?->full_name,
                'department' => $a->employee?->department?->name,
                'clock_in' => $a->clock_in?->toTimeString(),
                'clock_out' => $a->clock_out?->toTimeString(),
                'status' => $a->status,
            ])
            ->values()
            ->all();
    }

    private function pendingLeaveRequests(): array
    {
        return LeaveRequest::query()
            ->where('status', 'pending')
            ->with(['employee', 'leaveType'])
            ->get()
            ->map(fn (LeaveRequest $lr) => [
                'name' => $lr->employee?->full_name,
                'leave_type' => $lr->leaveType?->name,
                'start_date' => $lr->start_date?->toDateString(),
                'end_date' => $lr->end_date?->toDateString(),
                'days' => $lr->days,
                'reason' => $lr->reason,
            ])
            ->values()
            ->all();
    }

    private function headcount(?string $department): array
    {
        $query = Employee::query()->where('employment_status', 'active');

        if (! empty($department)) {
            $query->whereHas('department', fn ($q) => $q->where('name', 'like', "%{$department}%"));
        }

        return ['count' => $query->count(), 'department' => $department];
    }

    private function employeeInfo(string $name): array
    {
        if (empty($name)) {
            return ['error' => 'No employee name provided.'];
        }

        $employee = Employee::query()
            ->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ['%'.$name.'%'])
            ->with(['department', 'designation', 'manager'])
            ->first();

        if (! $employee) {
            return ['found' => false, 'message' => "No employee found matching \"{$name}\"."];
        }

        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        $onLeave = LeaveRequest::where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $today)
            ->whereDate('end_date', '>=', $today)
            ->exists();

        return [
            'found' => true,
            'name' => $employee->full_name,
            'employee_code' => $employee->employee_code,
            'department' => $employee->department?->name,
            'designation' => $employee->designation?->title,
            'manager' => $employee->manager?->full_name,
            'employment_status' => $employee->employment_status,
            'date_of_joining' => $employee->date_of_joining?->toDateString(),
            'today_status' => $onLeave ? 'on_leave' : ($attendance?->status ?? 'no_record'),
        ];
    }
}
