<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApiKey extends Model
{
    protected $fillable = [
        'company_id', 'name', 'key', 'scopes', 'is_active', 'last_used_at', 'expires_at',
    ];

    protected $casts = [
        'scopes'      => 'array',
        'is_active'   => 'boolean',
        'last_used_at'=> 'datetime',
        'expires_at'  => 'datetime',
    ];

    protected $hidden = ['key'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
