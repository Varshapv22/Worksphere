<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CareerStep extends Model
{
    protected $fillable = [
        'career_track_id', 'title', 'description', 'skills_required', 'resources', 'sort_order',
    ];

    protected $casts = [
        'skills_required' => 'array',
        'resources'       => 'array',
    ];

    public function track(): BelongsTo
    {
        return $this->belongsTo(CareerTrack::class, 'career_track_id');
    }
}
