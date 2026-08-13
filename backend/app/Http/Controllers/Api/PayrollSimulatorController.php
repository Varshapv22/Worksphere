<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Employee;
use App\Models\Payroll;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollSimulatorController extends Controller
{
    public function simulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'         => ['required', 'integer', 'exists:employees,id'],
            'new_basic_salary'    => ['required', 'numeric', 'min:0'],
            'allowances'          => ['nullable', 'numeric', 'min:0'],
            'bonus'               => ['nullable', 'numeric', 'min:0'],
            'overtime_pay'        => ['nullable', 'numeric', 'min:0'],
            'tax_rate'            => ['nullable', 'numeric', 'min:0', 'max:100'],
            'provident_fund_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $companyId = $request->user()->company_id;

        $employee = Employee::with('designation:id,title', 'department:id,name')
            ->where('company_id', $companyId)
            ->findOrFail($data['employee_id']);

        // Fetch current payroll for reference
        $currentPayroll = Payroll::where('company_id', $companyId)
            ->where('employee_id', $employee->id)
            ->orderByDesc('period_year')
            ->orderByDesc('period_month')
            ->first();

        $newBasic       = (float) $data['new_basic_salary'];
        $allowances     = isset($data['allowances']) ? (float) $data['allowances'] : ($currentPayroll?->allowances ?? $newBasic * 0.1);
        $bonus          = isset($data['bonus']) ? (float) $data['bonus'] : ($currentPayroll?->bonus ?? 0);
        $overtimePay    = isset($data['overtime_pay']) ? (float) $data['overtime_pay'] : ($currentPayroll?->overtime_pay ?? 0);
        $taxRate        = isset($data['tax_rate']) ? (float) $data['tax_rate'] : 15.0;
        $pfRate         = isset($data['provident_fund_rate']) ? (float) $data['provident_fund_rate'] : 8.0;

        $grossSalary    = $newBasic + $allowances + $bonus + $overtimePay;
        $tax            = round($newBasic * $taxRate / 100, 2);
        $providentFund  = round($newBasic * $pfRate / 100, 2);
        $netSalary      = round($grossSalary - $tax - $providentFund, 2);

        $currentBasic   = $currentPayroll?->basic_salary ?? 0;
        $currentNet     = $currentPayroll?->net_salary ?? 0;
        $salaryChange   = $currentBasic > 0 ? round(($newBasic - $currentBasic) / $currentBasic * 100, 2) : null;

        return response()->json([
            'data' => [
                'employee' => [
                    'id'          => $employee->id,
                    'full_name'   => $employee->full_name,
                    'designation' => $employee->designation?->title,
                    'department'  => $employee->department?->name,
                ],
                'current' => [
                    'basic_salary' => $currentBasic,
                    'net_salary'   => $currentNet,
                    'period'       => $currentPayroll
                        ? sprintf('%04d-%02d', $currentPayroll->period_year, $currentPayroll->period_month)
                        : null,
                ],
                'simulation' => [
                    'basic_salary'     => $newBasic,
                    'allowances'       => $allowances,
                    'bonus'            => $bonus,
                    'overtime_pay'     => $overtimePay,
                    'gross_salary'     => round($grossSalary, 2),
                    'tax'              => $tax,
                    'tax_rate'         => $taxRate,
                    'provident_fund'   => $providentFund,
                    'pf_rate'          => $pfRate,
                    'net_salary'       => $netSalary,
                ],
                'comparison' => [
                    'salary_change_pct' => $salaryChange,
                    'net_change'        => round($netSalary - $currentNet, 2),
                ],
            ],
        ]);
    }

    public function bulkSimulate(Request $request): JsonResponse
    {
        $data = $request->validate([
            'department_id'       => ['nullable', 'integer', 'exists:departments,id'],
            'increase_pct'        => ['required', 'numeric', 'min:-100', 'max:200'],
            'tax_rate'            => ['nullable', 'numeric', 'min:0', 'max:100'],
            'provident_fund_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
        ]);

        $companyId = $request->user()->company_id;
        $taxRate   = (float) ($data['tax_rate'] ?? 15.0);
        $pfRate    = (float) ($data['provident_fund_rate'] ?? 8.0);
        $pct       = (float) $data['increase_pct'];

        $payrolls = Payroll::where('payrolls.company_id', $companyId)
            ->join('employees', 'payrolls.employee_id', '=', 'employees.id')
            ->when(isset($data['department_id']), fn ($q) => $q->where('employees.department_id', $data['department_id']))
            ->selectRaw('payrolls.*, employees.first_name, employees.last_name')
            ->orderByDesc('payrolls.period_year')
            ->orderByDesc('payrolls.period_month')
            ->get()
            ->unique('employee_id');

        $results = $payrolls->map(function ($p) use ($pct, $taxRate, $pfRate) {
            $newBasic    = round($p->basic_salary * (1 + $pct / 100), 2);
            $allowances  = $p->allowances;
            $bonus       = $p->bonus;
            $overtime    = $p->overtime_pay;
            $gross       = $newBasic + $allowances + $bonus + $overtime;
            $tax         = round($newBasic * $taxRate / 100, 2);
            $pf          = round($newBasic * $pfRate / 100, 2);
            $net         = round($gross - $tax - $pf, 2);

            return [
                'employee_id'   => $p->employee_id,
                'full_name'     => $p->first_name . ' ' . $p->last_name,
                'current_basic' => $p->basic_salary,
                'current_net'   => $p->net_salary,
                'new_basic'     => $newBasic,
                'new_net'       => $net,
                'net_change'    => round($net - $p->net_salary, 2),
            ];
        })->values();

        $totalCurrentNet = $results->sum('current_net');
        $totalNewNet     = $results->sum('new_net');

        return response()->json([
            'data' => [
                'employees'          => $results,
                'total_current_cost' => round($totalCurrentNet, 2),
                'total_new_cost'     => round($totalNewNet, 2),
                'total_increase'     => round($totalNewNet - $totalCurrentNet, 2),
            ],
        ]);
    }
}
