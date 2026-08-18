<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Company extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'logo_path',
        'email',
        'phone',
        'address',
        'timezone',
        'currency',
        'subscription_plan_id',
        'trial_ends_at',
        'is_active',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'trial_ends_at' => 'datetime',
            'is_active' => 'boolean',
        ];
    }

    public function subscriptionPlan(): BelongsTo
    {
        return $this->belongsTo(SubscriptionPlan::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    public function designations(): HasMany
    {
        return $this->hasMany(Designation::class);
    }

    public function employees(): HasMany
    {
        return $this->hasMany(Employee::class);
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveTypes(): HasMany
    {
        return $this->hasMany(LeaveType::class);
    }

    public function leaveBalances(): HasMany
    {
        return $this->hasMany(LeaveBalance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function modules(): BelongsToMany
    {
        return $this->belongsToMany(Module::class, 'company_module')
            ->withPivot('is_enabled', 'enabled_at', 'is_granted')
            ->withTimestamps();
    }

    public function hasModuleEnabled(string $slug): bool
    {
        return $this->modules()->where('slug', $slug)->wherePivot('is_enabled', true)->exists();
    }

    /**
     * Whether the super admin has granted this company access to a module.
     * Absent a pivot row (never toggled or curated), a module is granted by
     * default - grants are an opt-out restriction, not an opt-in whitelist.
     */
    public function hasModuleGranted(string $slug): bool
    {
        $pivot = $this->modules()->where('slug', $slug)->first()?->pivot;

        return $pivot === null ? true : (bool) $pivot->is_granted;
    }
}
