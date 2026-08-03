<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AttendanceResource;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class AttendanceController extends Controller
{
    /**
     * History: self for plain employees, whole team for managers/admins.
     * Filterable by date range and employee_id.
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $query = Attendance::query()->with('employee');

        if (! $user->can('attendance.manage') && ! $user->can('attendance.view')) {
            $employee = $user->employee;

            abort_unless($employee, 403, 'No employee record linked to this account.');

            $query->where('employee_id', $employee->id);
        } elseif ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        if ($request->filled('from')) {
            $query->whereDate('date', '>=', $request->date('from'));
        }

        if ($request->filled('to')) {
            $query->whereDate('date', '<=', $request->date('to'));
        }

        $attendances = $query->orderByDesc('date')->paginate($request->integer('per_page', 15));

        return AttendanceResource::collection($attendances);
    }

    /**
     * Clock in the authenticated user's linked employee for today.
     */
    public function clockIn(Request $request)
    {
        $employee = $request->user()->employee;

        abort_unless($employee, 403, 'No employee record linked to this account.');

        $today = Carbon::today()->toDateString();

        $existing = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        if ($existing && $existing->clock_in) {
            throw ValidationException::withMessages([
                'clock_in' => 'You have already clocked in today.',
            ]);
        }

        $attendance = $existing ?: new Attendance([
            'company_id' => $employee->company_id,
            'employee_id' => $employee->id,
            'date' => $today,
        ]);

        $attendance->clock_in = now();
        $attendance->status = $attendance->status ?: 'present';
        $attendance->source = $request->string('source')->toString() ?: 'web';
        $attendance->save();

        return new AttendanceResource($attendance->fresh('employee'));
    }

    /**
     * Clock out the authenticated user's linked employee for today.
     */
    public function clockOut(Request $request)
    {
        $employee = $request->user()->employee;

        abort_unless($employee, 403, 'No employee record linked to this account.');

        $today = Carbon::today()->toDateString();

        $attendance = Attendance::where('employee_id', $employee->id)
            ->whereDate('date', $today)
            ->first();

        if (! $attendance || ! $attendance->clock_in) {
            throw ValidationException::withMessages([
                'clock_out' => 'You have not clocked in today.',
            ]);
        }

        if ($attendance->clock_out) {
            throw ValidationException::withMessages([
                'clock_out' => 'You have already clocked out today.',
            ]);
        }

        $attendance->clock_out = now();
        $attendance->work_minutes = $attendance->clock_in->diffInMinutes($attendance->clock_out);
        $attendance->save();

        return new AttendanceResource($attendance->fresh('employee'));
    }
}
