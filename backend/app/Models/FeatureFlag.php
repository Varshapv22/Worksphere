<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class FeatureFlag extends Model
{
    protected $fillable = ['key', 'label', 'description', 'is_enabled_globally'];

    protected function casts(): array
    {
        return ['is_enabled_globally' => 'boolean'];
    }

    public function companies(): BelongsToMany
    {
        return $this->belongsToMany(Company::class, 'company_feature_flag')
            ->withPivot('is_enabled');
    }
}
