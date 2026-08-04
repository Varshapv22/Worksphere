<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PerformanceReview extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'company_id',
        'employee_id',
        'reviewer_id',
        'review_period',
        'communication_rating',
        'technical_rating',
        'teamwork_rating',
        'leadership_rating',
        'overall_score',
        'summary',
    ];

    protected function casts(): array
    {
        return [
            'communication_rating' => 'integer',
            'technical_rating' => 'integer',
            'teamwork_rating' => 'integer',
            'leadership_rating' => 'integer',
            'overall_score' => 'decimal:2',
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

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'reviewer_id');
    }
}
