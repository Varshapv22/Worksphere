<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Attendance;
use App\Models\Employee;
use App\Models\LeaveRequest;
use App\Models\Payroll;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function overview(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;
        $now = now();

        // Headcount
        $totalEmployees     = Employee::where('company_id', $companyId)->count();
        $activeEmployees    = Employee::where('company_id', $companyId)->where('employment_status', 'active')->count();
        $newHiresThisMonth  = Employee::where('company_id', $companyId)
            ->whereYear('date_of_joining', $now->year)
            ->whereMonth('date_of_joining', $now->month)
            ->count();
        $terminatedThisMonth = Employee::where('company_id', $companyId)
            ->where('employment_status', 'terminated')
            ->whereYear('updated_at', $now->year)
            ->whereMonth('updated_at', $now->month)
            ->count();

        // Attendance this month
        $attendanceThisMonth = Attendance::where('company_id', $companyId)
            ->whereYear('date', $now->year)
            ->whereMonth('date', $now->month)
            ->selectRaw('date, count(*) as present')
            ->groupBy('date')
            ->get();

        $avgDailyAttendance = $attendanceThisMonth->avg('present') ?? 0;
        $attendanceRate     = $totalEmployees > 0
            ? round($avgDailyAttendance / $totalEmployees * 100, 1)
            : 0;

        // Leave this month
        $leaveThisMonth = LeaveRequest::where('company_id', $companyId)
            ->whereYear('start_date', $now->year)
            ->whereMonth('start_date', $now->month)
            ->where('status', 'approved')
            ->count();

        // Payroll this month vs last
        $payrollThisMonth = Payroll::where('company_id', $companyId)
            ->whereYear('period_year', $now->year)
            ->where('period_month', $now->month)
            ->sum('net_salary');

        $payrollLastMonth = Payroll::where('company_id', $companyId)
            ->where(function ($q) use ($now) {
                $lastMonth = $now->copy()->subMonth();
                $q->where('period_year', $lastMonth->year)->where('period_month', $lastMonth->month);
            })
            ->sum('net_salary');

        $payrollGrowth = $payrollLastMonth > 0
            ? round(($payrollThisMonth - $payrollLastMonth) / $payrollLastMonth * 100, 1)
            : 0;

        return response()->json([
            'data' => [
                'headcount' => [
                    'total'              => $totalEmployees,
                    'active'             => $activeEmployees,
                    'new_hires_month'    => $newHiresThisMonth,
                    'terminated_month'   => $terminatedThisMonth,
                ],
                'attendance' => [
                    'rate_percent'          => $attendanceRate,
                    'avg_daily_present'     => round($avgDailyAttendance, 1),
                    'approved_leaves_month' => $leaveThisMonth,
                ],
                'payroll' => [
                    'this_month'   => round($payrollThisMonth, 2),
                    'last_month'   => round($payrollLastMonth, 2),
                    'growth_pct'   => $payrollGrowth,
                ],
            ],
        ]);
    }

    public function hiringTrends(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $trends = Employee::where('company_id', $companyId)
            ->whereNotNull('date_of_joining')
            ->where('date_of_joining', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(date_of_joining, '%Y-%m') as month, count(*) as hires")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json(['data' => $trends]);
    }

    public function attrition(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $attrition = Employee::where('company_id', $companyId)
            ->where('employment_status', 'terminated')
            ->where('updated_at', '>=', now()->subMonths(11)->startOfMonth())
            ->selectRaw("DATE_FORMAT(updated_at, '%Y-%m') as month, count(*) as terminations")
            ->groupBy('month')
            ->orderBy('month')
            ->get();

        return response()->json(['data' => $attrition]);
    }

    public function departmentBreakdown(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $breakdown = Employee::where('employees.company_id', $companyId)
            ->join('departments', 'employees.department_id', '=', 'departments.id')
            ->selectRaw('departments.name as department, count(*) as headcount, employment_status')
            ->groupBy('departments.name', 'employment_status')
            ->get()
            ->groupBy('department')
            ->map(function ($rows, $dept) {
                return [
                    'department' => $dept,
                    'total'      => $rows->sum('headcount'),
                    'active'     => $rows->where('employment_status', 'active')->sum('headcount'),
                ];
            })
            ->values();

        return response()->json(['data' => $breakdown]);
    }

    public function payrollTrends(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $trends = Payroll::where('company_id', $companyId)
            ->where('period_year', '>=', now()->subYear()->year)
            ->selectRaw("CONCAT(period_year, '-', LPAD(period_month, 2, '0')) as month, SUM(net_salary) as total")
            ->groupBy('period_year', 'period_month')
            ->orderBy('period_year')
            ->orderBy('period_month')
            ->get();

        return response()->json(['data' => $trends]);
    }
}
