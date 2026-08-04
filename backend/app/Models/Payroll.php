<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payroll extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'period_month',
        'period_year',
        'basic_salary',
        'allowances',
        'bonus',
        'overtime_pay',
        'tax',
        'provident_fund',
        'loan_deduction',
        'net_salary',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'period_month' => 'integer',
            'period_year' => 'integer',
            'basic_salary' => 'decimal:2',
            'allowances' => 'decimal:2',
            'bonus' => 'decimal:2',
            'overtime_pay' => 'decimal:2',
            'tax' => 'decimal:2',
            'provident_fund' => 'decimal:2',
            'loan_deduction' => 'decimal:2',
            'net_salary' => 'decimal:2',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
