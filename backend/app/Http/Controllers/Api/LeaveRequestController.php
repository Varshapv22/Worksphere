<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreLeaveRequestRequest;
use App\Http\Resources\LeaveRequestResource;
use App\Models\LeaveBalance;
use App\Models\LeaveRequest;
use App\Models\LeaveType;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class LeaveRequestController extends Controller
{
    /**
     * History: self for plain employees, whole team for managers/admins.
     * Filterable by status.
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', LeaveRequest::class);

        $user = $request->user();

        $query = LeaveRequest::query()->with('employee', 'leaveType', 'approver');

        if (! $user->can('leave.manage') && ! $user->can('leave.approve')) {
            $employee = $user->employee;

            abort_unless($employee, 403, 'No employee record linked to this account.');

            $query->where('employee_id', $employee->id);
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        $leaveRequests = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 15));

        return LeaveRequestResource::collection($leaveRequests);
    }

    /**
     * Employee requests leave. Validates against remaining leave balance,
     * auto-creating a leave_balances row for the current year if missing.
     */
    public function store(StoreLeaveRequestRequest $request)
    {
        $user = $request->user();
        $validated = $request->validated();

        $employeeId = $validated['employee_id'] ?? $user->employee?->id;

        abort_unless($employeeId, 422, 'No employee record specified or linked to this account.');

        // Employees requesting on their own behalf must be requesting for themselves.
        if (! $user->can('leave.manage') && $user->employee && (int) $employeeId !== $user->employee->id) {
            abort(403, 'You may only request leave for yourself.');
        }

        $leaveType = LeaveType::findOrFail($validated['leave_type_id']);
        $year = (int) date('Y', strtotime($validated['start_date']));

        $leaveRequest = DB::transaction(function () use ($validated, $employeeId, $leaveType, $year, $user) {
            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $employeeId,
                    'leave_type_id' => $leaveType->id,
                    'year' => $year,
                ],
                [
                    'company_id' => $user->company_id,
                    'allocated' => $leaveType->days_per_year,
                    'used' => 0,
                ]
            );

            $remaining = (float) $balance->allocated + (float) $balance->carry_forward - (float) $balance->used;

            if ((float) $validated['days'] > $remaining) {
                throw ValidationException::withMessages([
                    'days' => "Insufficient leave balance. Remaining: {$remaining} day(s).",
                ]);
            }

            return LeaveRequest::create([
                'employee_id' => $employeeId,
                'leave_type_id' => $leaveType->id,
                'start_date' => $validated['start_date'],
                'end_date' => $validated['end_date'],
                'days' => $validated['days'],
                'is_half_day' => $validated['is_half_day'] ?? false,
                'reason' => $validated['reason'] ?? null,
                'status' => 'pending',
            ]);
        });

        return new LeaveRequestResource($leaveRequest->fresh(['employee', 'leaveType']));
    }

    public function show(LeaveRequest $leaveRequest)
    {
        $this->authorize('view', $leaveRequest);

        return new LeaveRequestResource($leaveRequest->load('employee', 'leaveType', 'approver'));
    }

    /**
     * Manager/admin approves a pending leave request and debits the balance.
     */
    public function approve(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('approve', $leaveRequest);

        if ($leaveRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending leave requests can be approved.',
            ]);
        }

        DB::transaction(function () use ($request, $leaveRequest) {
            $leaveRequest->update([
                'status' => 'approved',
                'approved_by' => $request->user()->id,
                'approved_at' => now(),
            ]);

            $year = (int) date('Y', strtotime($leaveRequest->start_date));

            $balance = LeaveBalance::firstOrCreate(
                [
                    'employee_id' => $leaveRequest->employee_id,
                    'leave_type_id' => $leaveRequest->leave_type_id,
                    'year' => $year,
                ],
                [
                    'company_id' => $leaveRequest->company_id,
                    'allocated' => $leaveRequest->leaveType->days_per_year,
                    'used' => 0,
                ]
            );

            $balance->increment('used', (float) $leaveRequest->days);
        });

        return new LeaveRequestResource($leaveRequest->fresh(['employee', 'leaveType', 'approver']));
    }

    /**
     * Manager/admin rejects a pending leave request.
     */
    public function reject(Request $request, LeaveRequest $leaveRequest)
    {
        $this->authorize('approve', $leaveRequest);

        if ($leaveRequest->status !== 'pending') {
            throw ValidationException::withMessages([
                'status' => 'Only pending leave requests can be rejected.',
            ]);
        }

        $leaveRequest->update([
            'status' => 'rejected',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);

        return new LeaveRequestResource($leaveRequest->fresh(['employee', 'leaveType', 'approver']));
    }
}
