<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeTraining extends Model
{
    use BelongsToTenant;

    protected $fillable = ['company_id', 'employee_id', 'course_name', 'provider', 'completed_date', 'status'];

    protected function casts(): array
    {
        return [
            'completed_date' => 'date',
        ];
    }

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }
}
