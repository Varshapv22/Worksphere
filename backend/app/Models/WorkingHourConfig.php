<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WorkingHourConfig extends Model
{
    protected $fillable = [
        'company_id',
        'work_start_time',
        'work_end_time',
        'standard_hours_per_day',
        'late_grace_minutes',
        'half_day_threshold_hours',
        'work_days',
    ];

    protected $casts = [
        'standard_hours_per_day' => 'float',
        'late_grace_minutes' => 'integer',
        'half_day_threshold_hours' => 'float',
        'work_days' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
