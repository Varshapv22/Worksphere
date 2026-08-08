<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WhiteLabelConfig extends Model
{
    protected $fillable = [
        'company_id', 'app_name', 'logo_url', 'favicon_url', 'primary_color',
        'secondary_color', 'login_message', 'support_email', 'custom_domain', 'email_footer',
    ];

    protected $casts = [
        'email_footer' => 'array',
    ];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
