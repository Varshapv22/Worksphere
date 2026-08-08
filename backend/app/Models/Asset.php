<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Asset extends Model
{
    protected $fillable = [
        'company_id', 'name', 'type', 'serial_number', 'brand', 'model',
        'purchase_date', 'purchase_cost', 'warranty_expiry', 'status',
        'assigned_to', 'assigned_date', 'returned_date', 'notes',
    ];

    protected $casts = [
        'purchase_date'   => 'date',
        'warranty_expiry' => 'date',
        'assigned_date'   => 'date',
        'returned_date'   => 'date',
        'purchase_cost'   => 'float',
    ];

    public function assignedEmployee(): BelongsTo
    {
        return $this->belongsTo(Employee::class, 'assigned_to');
    }
}
