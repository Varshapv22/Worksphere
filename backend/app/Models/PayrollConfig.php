<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PayrollConfig extends Model
{
    protected $fillable = [
        'company_id', 'country_code', 'country_name', 'currency_code', 'currency_symbol',
        'tax_rate', 'provident_fund_rate', 'payroll_frequency', 'timezone',
        'holidays', 'tax_brackets', 'is_active',
    ];

    protected $casts = [
        'tax_rate'            => 'float',
        'provident_fund_rate' => 'float',
        'holidays'            => 'array',
        'tax_brackets'        => 'array',
        'is_active'           => 'boolean',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
