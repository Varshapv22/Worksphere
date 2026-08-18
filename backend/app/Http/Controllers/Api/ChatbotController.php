<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class ChatbotController extends Controller
{
    private const MODEL = 'gemini-3.6-flash';

    private const MAX_TOOL_ROUNDS = 6;

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
                        'temperature' => 0.1,
                        'maxOutputTokens' => 2048,
                    ],
                ]
            );

            if ($response->failed()) {
                Log::error('Chatbot Gemini request failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                ]);

                if ($response->status() === 429) {
                    return response()->json([
                        'message' => 'The AI assistant has hit its usage limit for now (free-tier quota). Please wait a minute and try again.',
                    ], 429);
                }

                return response()->json([
                    'message' => 'The AI assistant is temporarily unavailable. Please try again shortly.',
                ], 502);
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

            // Fix: empty args must be stdClass, not [], to avoid Gemini proto error on re-send
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
        $now = Carbon::now();
        $today = $now->toDateString();
        $dayName = $now->format('l');
        $time = $now->format('H:i');
        $year = $now->year;

        return <<<TEXT
You are the WorkSphere HR Assistant for {$companyName}.
Today is {$dayName}, {$today}. Current time: {$time}. Current year: {$year}.

STRICT RULES — always follow:
1. ALWAYS call the relevant tool before answering ANY question about employees, attendance, leave, headcount, or departments. Never guess, estimate, or invent names, dates, or numbers.
2. If a tool returns an empty list, say so plainly (e.g. "No one is on leave today."). Do not fabricate reasons.
3. For "how many are present/absent/late today?" — call get_attendance_summary (not the list tools) for efficiency.
4. For "who is absent AND on leave today?" or any combined question — call all relevant tools before answering.
5. For "tell me about [name]" or "[name]'s status/info" — always call get_employee_info.
6. For "[name]'s leave balance" or "how many leaves does [name] have left?" — call get_leave_balance.
7. For "upcoming leaves" or "who is on leave this week/next N days?" — call get_upcoming_leaves.
8. For "list departments" or "what departments exist?" — call list_departments.
9. For "list employees" or "who works in [department]?" — call list_employees.
10. Format answers clearly: list names on separate lines when there are multiple people. Use plain text only (no markdown). Keep responses concise and natural for text-to-speech.
11. For non-HR questions (greetings, general knowledge), answer briefly without fabricating company data.
12. Never say you "don't have access" to HR data — you have tools, always use them.
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
                'name' => 'get_attendance_summary',
                'description' => 'Get a count summary of attendance statuses (present, absent, late, half_day, on_leave) for a given date. Use this for "how many are present/absent/late today?" questions — it is faster than listing individuals.',
                'parameters' => $dateParam,
            ],
            [
                'name' => 'get_employees_on_leave',
                'description' => 'List employees on approved leave for a given date (defaults to today). Use when the user asks WHO is on leave.',
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
                'name' => 'get_upcoming_leaves',
                'description' => 'List approved leave requests starting in the next N days. Use for "who is on leave this week / coming soon / upcoming leaves".',
                'parameters' => [
                    'type' => 'object',
                    'properties' => [
                        'days' => [
                            'type' => 'integer',
                            'description' => 'How many days ahead to look (default 7).',
                        ],
                    ],
                ],
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
                'name' => 'list_employees',
                'description' => 'List active employees by name with department and designation, optionally filtered by department name. Use when the user asks to see, name, or list employees.',
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
                'name' => 'list_departments',
                'description' => 'List all departments with employee headcount and department manager name.',
                'parameters' => ['type' => 'object', 'properties' => new \stdClass],
            ],
            [
                'name' => 'get_employee_info',
                'description' => "Look up a specific employee's full details (department, designation, manager, email, phone, join date, today's attendance/leave status) by name.",
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
            [
                'name' => 'get_leave_balance',
                'description' => "Get an employee's remaining leave balance per leave type for the current year.",
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
            'get_attendance_summary' => $this->attendanceSummary($date),
            'get_employees_on_leave' => $this->employeesOnLeave($date),
            'get_late_employees' => $this->attendanceByStatus($date, ['late']),
            'get_absent_employees' => $this->attendanceByStatus($date, ['absent']),
            'get_present_employees' => $this->attendanceByStatus($date, ['present', 'half_day']),
            'get_upcoming_leaves' => $this->upcomingLeaves((int) ($args['days'] ?? 7)),
            'get_pending_leave_requests' => $this->pendingLeaveRequests(),
            'get_headcount' => $this->headcount($args['department'] ?? null),
            'list_employees' => $this->listEmployees($args['department'] ?? null),
            'list_departments' => $this->listDepartments(),
            'get_employee_info' => $this->employeeInfo($args['name'] ?? ''),
            'get_leave_balance' => $this->leaveBalance($args['name'] ?? ''),
            default => ['error' => "Unknown tool: {$name}"],
        };
    }

    // ── Tools ────────────────────────────────────────────────────────────────

    private function attendanceSummary(string $date): array
    {
        $attendance = Attendance::query()
            ->whereDate('date', $date)
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->all();

        $onLeave = LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->count();

        return [
            'date' => $date,
            'present' => (int) ($attendance['present'] ?? 0),
            'half_day' => (int) ($attendance['half_day'] ?? 0),
            'late' => (int) ($attendance['late'] ?? 0),
            'absent' => (int) ($attendance['absent'] ?? 0),
            'on_leave' => $onLeave,
            'total_with_attendance_record' => array_sum($attendance),
        ];
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

    private function upcomingLeaves(int $days): array
    {
        $from = Carbon::today()->toDateString();
        $to = Carbon::today()->addDays($days)->toDateString();

        return LeaveRequest::query()
            ->where('status', 'approved')
            ->whereDate('start_date', '>=', $from)
            ->whereDate('start_date', '<=', $to)
            ->orderBy('start_date')
            ->with(['employee.department', 'leaveType'])
            ->get()
            ->map(fn (LeaveRequest $lr) => [
                'name' => $lr->employee?->full_name,
                'department' => $lr->employee?->department?->name,
                'leave_type' => $lr->leaveType?->name,
                'start_date' => $lr->start_date?->toDateString(),
                'end_date' => $lr->end_date?->toDateString(),
                'days' => $lr->days,
            ])
            ->values()
            ->all();
    }

    private function pendingLeaveRequests(): array
    {
        return LeaveRequest::query()
            ->where('status', 'pending')
            ->with(['employee', 'leaveType'])
            ->orderBy('created_at', 'desc')
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

        return ['count' => $query->count(), 'department' => $department ?? 'all'];
    }

    private function listEmployees(?string $department): array
    {
        $query = Employee::query()->where('employment_status', 'active')->with(['department', 'designation']);

        if (! empty($department)) {
            $query->whereHas('department', fn ($q) => $q->where('name', 'like', "%{$department}%"));
        }

        return $query->orderBy('first_name')
            ->limit(100)
            ->get()
            ->map(fn (Employee $e) => [
                'name' => $e->full_name,
                'employee_code' => $e->employee_code,
                'department' => $e->department?->name,
                'designation' => $e->designation?->title,
                'email' => $e->email,
            ])
            ->values()
            ->all();
    }

    private function listDepartments(): array
    {
        return Department::query()
            ->withCount(['employees' => fn ($q) => $q->where('employment_status', 'active')])
            ->with('manager')
            ->orderBy('name')
            ->get()
            ->map(fn (Department $d) => [
                'name' => $d->name,
                'headcount' => $d->employees_count,
                'manager' => $d->manager?->full_name,
            ])
            ->values()
            ->all();
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
            'email' => $employee->email,
            'phone' => $employee->phone,
            'employment_status' => $employee->employment_status,
            'date_of_joining' => $employee->date_of_joining?->toDateString(),
            'today_status' => $onLeave ? 'on_leave' : ($attendance?->status ?? 'no_record'),
            'today_clock_in' => $attendance?->clock_in?->toTimeString(),
            'today_clock_out' => $attendance?->clock_out?->toTimeString(),
        ];
    }

    private function leaveBalance(string $name): array
    {
        if (empty($name)) {
            return ['error' => 'No employee name provided.'];
        }

        $employee = Employee::query()
            ->whereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ['%'.$name.'%'])
            ->first();

        if (! $employee) {
            return ['found' => false, 'message' => "No employee found matching \"{$name}\"."];
        }

        $year = Carbon::now()->year;

        $balances = LeaveBalance::where('employee_id', $employee->id)
            ->where('year', $year)
            ->with('leaveType')
            ->get()
            ->map(fn (LeaveBalance $lb) => [
                'leave_type' => $lb->leaveType?->name,
                'allocated' => (float) $lb->allocated,
                'used' => (float) $lb->used,
                'remaining' => $lb->remaining,
            ])
            ->values()
            ->all();

        return [
            'found' => true,
            'employee' => $employee->full_name,
            'year' => $year,
            'balances' => $balances,
        ];
    }
}
