<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\Department;
use App\Models\Employee;
use App\Models\Payroll;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AdvisorController extends Controller
{
    private const BURNOUT_WARNING_HOURS = 55;

    private const BURNOUT_CRITICAL_HOURS = 60;

    private const UNDERSTAFFED_AVG_HOURS = 45;

    private const UNDERSTAFFED_MAX_HEADCOUNT = 3;

    private const PROMOTION_MIN_TENURE_MONTHS = 12;

    private const PROMOTION_MIN_SCORE = 4.0;

    private const PAYROLL_TREND_THRESHOLD_PERCENT = 5.0;

    /**
     * Rule-based workforce insights derived from real attendance, payroll,
     * and performance-review data for the current tenant.
     */
    public function insights(Request $request)
    {
        $user = $request->user();

        abort_unless(
            $user->can('departments.manage') || $user->can('attendance.manage'),
            403,
            'You do not have access to workforce insights.'
        );

        $insights = collect([
            $this->burnoutInsight(),
            $this->promotionInsight(),
            $this->staffingInsight(),
            $this->payrollTrendInsight(),
        ])->filter()->values();

        return response()->json([
            'data' => $insights,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    private function burnoutInsight(): ?array
    {
        $since = Carbon::today()->subDays(6);

        $atRisk = Employee::query()
            ->where('employment_status', 'active')
            ->with('department')
            ->get()
            ->map(function (Employee $employee) use ($since) {
                $minutes = Attendance::where('employee_id', $employee->id)
                    ->whereDate('date', '>=', $since)
                    ->sum('work_minutes');

                return ['employee' => $employee, 'hours' => round($minutes / 60, 1)];
            })
            ->filter(fn (array $row) => $row['hours'] > self::BURNOUT_WARNING_HOURS)
            ->sortByDesc('hours')
            ->values();

        if ($atRisk->isEmpty()) {
            return null;
        }

        $critical = $atRisk->contains(fn (array $row) => $row['hours'] > self::BURNOUT_CRITICAL_HOURS);
        $count = $atRisk->count();

        return [
            'id' => 'burnout-risk',
            'type' => 'burnout',
            'severity' => $critical ? 'critical' : 'warning',
            'title' => $count === 1
                ? '1 employee may be at risk of burnout'
                : "{$count} employees may be at risk of burnout",
            'description' => $atRisk->take(3)
                ->map(fn (array $row) => "{$row['employee']->full_name} worked {$row['hours']}h in the last 7 days")
                ->join('; ').'.',
            'metric' => ['label' => 'At risk', 'value' => (string) $count],
            'items' => $atRisk->take(5)->map(fn (array $row) => [
                'label' => $row['employee']->full_name,
                'sublabel' => $row['employee']->department?->name,
                'value' => "{$row['hours']}h this week",
            ])->all(),
        ];
    }

    private function promotionInsight(): ?array
    {
        $eligibleSince = Carbon::today()->subMonths(self::PROMOTION_MIN_TENURE_MONTHS);

        $candidates = Employee::query()
            ->where('employment_status', 'active')
            ->where('date_of_joining', '<=', $eligibleSince)
            ->with(['designation', 'performanceReviews' => fn ($q) => $q->orderByDesc('created_at')->limit(2)])
            ->get()
            ->map(function (Employee $employee) {
                $avgScore = $employee->performanceReviews->avg('overall_score');

                return ['employee' => $employee, 'score' => $avgScore ? round((float) $avgScore, 2) : null];
            })
            ->filter(fn (array $row) => $row['score'] !== null && $row['score'] >= self::PROMOTION_MIN_SCORE)
            ->sortByDesc('score')
            ->values();

        if ($candidates->isEmpty()) {
            return null;
        }

        $count = $candidates->count();

        return [
            'id' => 'promotion-candidates',
            'type' => 'promotion',
            'severity' => 'opportunity',
            'title' => $count === 1
                ? '1 employee is eligible for promotion based on performance trends'
                : "{$count} employees are eligible for promotion based on performance trends",
            'description' => $candidates->take(3)
                ->map(fn (array $row) => "{$row['employee']->full_name} — avg score {$row['score']}/5")
                ->join('; ').'.',
            'metric' => ['label' => 'Candidates', 'value' => (string) $count],
            'items' => $candidates->take(5)->map(fn (array $row) => [
                'label' => $row['employee']->full_name,
                'sublabel' => $row['employee']->designation?->title,
                'value' => "{$row['score']}/5",
            ])->all(),
        ];
    }

    private function staffingInsight(): ?array
    {
        $since = Carbon::today()->subDays(6);

        $flagged = Department::query()
            ->get()
            ->map(function (Department $department) use ($since) {
                $employees = Employee::where('department_id', $department->id)
                    ->where('employment_status', 'active')
                    ->with('designation')
                    ->get();

                if ($employees->isEmpty() || $employees->count() > self::UNDERSTAFFED_MAX_HEADCOUNT) {
                    return null;
                }

                $totalMinutes = Attendance::whereIn('employee_id', $employees->pluck('id'))
                    ->whereDate('date', '>=', $since)
                    ->sum('work_minutes');

                $avgHours = round(($totalMinutes / $employees->count()) / 60, 1);

                if ($avgHours <= self::UNDERSTAFFED_AVG_HOURS) {
                    return null;
                }

                return [
                    'department' => $department,
                    'headcount' => $employees->count(),
                    'avg_hours' => $avgHours,
                    'designation' => $employees->first()->designation?->title,
                ];
            })
            ->filter()
            ->values();

        if ($flagged->isEmpty()) {
            return null;
        }

        $top = $flagged->sortByDesc('avg_hours')->first();
        $count = $flagged->count();

        return [
            'id' => 'understaffed-departments',
            'type' => 'staffing',
            'severity' => 'warning',
            'title' => $count === 1
                ? "{$top['department']->name} looks understaffed"
                : "{$count} departments look understaffed",
            'description' => "{$top['department']->name} is averaging {$top['avg_hours']}h/employee this week with a headcount of {$top['headcount']}. Consider hiring more ".($top['designation'] ?? 'staff').'.',
            'metric' => ['label' => 'Departments flagged', 'value' => (string) $count],
            'items' => $flagged->map(fn (array $row) => [
                'label' => $row['department']->name,
                'sublabel' => $row['headcount'].' '.($row['headcount'] === 1 ? 'employee' : 'employees'),
                'value' => "{$row['avg_hours']}h avg/wk",
            ])->all(),
        ];
    }

    private function payrollTrendInsight(): ?array
    {
        $currentMonth = now();
        $previousMonth = now()->subMonthNoOverflow();

        $currentTotal = (float) Payroll::where('period_year', $currentMonth->year)
            ->where('period_month', $currentMonth->month)
            ->sum('net_salary');

        $previousTotal = (float) Payroll::where('period_year', $previousMonth->year)
            ->where('period_month', $previousMonth->month)
            ->sum('net_salary');

        if ($currentTotal <= 0 || $previousTotal <= 0) {
            return null;
        }

        $changePercent = round((($currentTotal - $previousTotal) / $previousTotal) * 100, 1);

        if (abs($changePercent) < self::PAYROLL_TREND_THRESHOLD_PERCENT) {
            return null;
        }

        $direction = $changePercent > 0 ? 'increased' : 'decreased';

        $overtimeShare = (float) Payroll::where('period_year', $currentMonth->year)
            ->where('period_month', $currentMonth->month)
            ->sum('overtime_pay');

        $reason = $overtimeShare > 0 && $changePercent > 0 ? ' largely due to overtime pay' : '';

        return [
            'id' => 'payroll-trend',
            'type' => 'payroll',
            'severity' => $changePercent > 0 ? 'warning' : 'info',
            'title' => "Payroll for {$currentMonth->format('F')} {$direction} by ".abs($changePercent).'%',
            'description' => "Total net payroll {$direction} from ".number_format($previousTotal, 0).' to '.number_format($currentTotal, 0)." compared to {$previousMonth->format('F')}{$reason}.",
            'metric' => ['label' => 'Change vs last month', 'value' => ($changePercent > 0 ? '+' : '').$changePercent.'%'],
            'items' => [
                ['label' => $previousMonth->format('F Y'), 'sublabel' => 'Previous', 'value' => number_format($previousTotal, 0)],
                ['label' => $currentMonth->format('F Y'), 'sublabel' => 'Current', 'value' => number_format($currentTotal, 0)],
            ],
        ];
    }
}
