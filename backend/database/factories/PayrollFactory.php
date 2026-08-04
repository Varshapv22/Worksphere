<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Payroll>
 */
class PayrollFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $basicSalary = fake()->numberBetween(3000, 9000);
        $allowances = round($basicSalary * 0.1, 2);
        $bonus = 0;
        $overtimePay = 0;
        $tax = round($basicSalary * 0.15, 2);
        $providentFund = round($basicSalary * 0.08, 2);
        $loanDeduction = 0;

        $netSalary = $basicSalary + $allowances + $bonus + $overtimePay - $tax - $providentFund - $loanDeduction;

        return [
            'company_id' => Company::factory(),
            'employee_id' => Employee::factory(),
            'period_month' => now()->month,
            'period_year' => now()->year,
            'basic_salary' => $basicSalary,
            'allowances' => $allowances,
            'bonus' => $bonus,
            'overtime_pay' => $overtimePay,
            'tax' => $tax,
            'provident_fund' => $providentFund,
            'loan_deduction' => $loanDeduction,
            'net_salary' => $netSalary,
            'status' => 'paid',
        ];
    }
}
