<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EmployeeCareerTrack extends Model
{
    protected $fillable = [
        'company_id', 'employee_id', 'career_track_id', 'current_step', 'started_at', 'completed_at',
    ];

    protected $casts = [
        'started_at'   => 'datetime',
        'completed_at' => 'datetime',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    public function track(): BelongsTo
    {
        return $this->belongsTo(CareerTrack::class, 'career_track_id');
    }
}
