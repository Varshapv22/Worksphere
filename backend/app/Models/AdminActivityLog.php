<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class AdminActivityLog extends Model
{
    const UPDATED_AT = null;

    protected $fillable = [
        'admin_id',
        'action',
        'subject_type',
        'subject_id',
        'subject_label',
        'changes',
        'ip_address',
    ];

    protected $casts = [
        'changes' => 'array',
    ];

    public function admin(): BelongsTo
    {
        return $this->belongsTo(User::class, 'admin_id');
    }

    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    /**
     * Record one super-admin action against the currently authenticated
     * request. $subject may be null for actions with no single target
     * (there are none yet, but the platform-management surface may grow one).
     *
     * @param  array<string, mixed>  $changes
     */
    public static function record(string $action, ?Model $subject, array $changes = [], ?string $label = null): self
    {
        return static::create([
            'admin_id' => request()->user()?->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label,
            'changes' => $changes,
            'ip_address' => request()->ip(),
        ]);
    }
}
