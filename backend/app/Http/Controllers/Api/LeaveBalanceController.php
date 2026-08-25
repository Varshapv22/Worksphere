<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\LeaveBalance;
use App\Models\LeaveType;
use Illuminate\Http\Request;

class LeaveBalanceController extends Controller
{
    /**
     * The authenticated user's own leave balance summary for the current
     * year: totals across all leave types plus a per-type breakdown.
     * Read-only - unlike LeaveRequestController, it never creates balance
     * rows, so a type with no row yet just reports its full entitlement.
     */
    public function me(Request $request)
    {
        $employee = $request->user()->employee;

        abort_unless($employee, 422, 'No employee record linked to this account.');

        $year = (int) date('Y');

        $balances = LeaveBalance::query()
            ->where('employee_id', $employee->id)
            ->where('year', $year)
            ->get()
            ->keyBy('leave_type_id');

        $breakdown = LeaveType::query()->get()->map(function (LeaveType $leaveType) use ($balances, $year) {
            $balance = $balances->get($leaveType->id);

            $allocated = (float) ($balance->allocated ?? $leaveType->days_per_year ?? 0);
            $used = (float) ($balance->used ?? 0);
            $carryForward = (float) ($balance->carry_forward ?? 0);

            return [
                'leave_type_id' => $leaveType->id,
                'leave_type' => $leaveType->name,
                'year' => $year,
                'allocated' => $allocated,
                'used' => $used,
                'carry_forward' => $carryForward,
                'remaining' => $allocated + $carryForward - $used,
            ];
        })->values();

        return response()->json([
            'year' => $year,
            'total_allocated' => (float) $breakdown->sum('allocated'),
            'total_carry_forward' => (float) $breakdown->sum('carry_forward'),
            'total_used' => (float) $breakdown->sum('used'),
            'total_remaining' => (float) $breakdown->sum('remaining'),
            'breakdown' => $breakdown,
        ]);
    }
}
