<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ComplianceItem extends Model
{
    protected $fillable = [
        'company_id', 'employee_id', 'type', 'name', 'document_number',
        'issue_date', 'expiry_date', 'status', 'notes',
    ];

    protected $casts = [
        'issue_date'  => 'date',
        'expiry_date' => 'date',
    ];

    public function employee(): BelongsTo
    {
        return $this->belongsTo(Employee::class);
    }

    /**
     * Recalculate status based on expiry date.
     */
    public function recalculateStatus(): void
    {
        if (! $this->expiry_date) {
            $this->status = 'valid';
            return;
        }

        $daysUntilExpiry = now()->diffInDays($this->expiry_date, false);

        $this->status = match (true) {
            $daysUntilExpiry < 0   => 'expired',
            $daysUntilExpiry <= 30 => 'expiring_soon',
            default                => 'valid',
        };
    }
}
