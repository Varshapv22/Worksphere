<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeCertificate extends Model
{
    use BelongsToTenant;

    protected $fillable = ['company_id', 'employee_id', 'name', 'issuer', 'issue_date', 'expiry_date'];

    protected function casts(): array
    {
        return [
            'issue_date'   => 'date',
            'expiry_date'  => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
