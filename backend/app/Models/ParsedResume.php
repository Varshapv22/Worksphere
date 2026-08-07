<?php

namespace App\Models;

use App\Models\Concerns\BelongsToTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ParsedResume extends Model
{
    use BelongsToTenant, HasFactory;

    protected $fillable = [
        'company_id',
        'file_name',
        'file_path',
        'status',
        'error_message',
        'candidate_name',
        'email',
        'phone',
        'summary',
        'skills',
        'experience',
        'education',
        'companies',
        'projects',
        'certifications',
        'raw_text',
    ];

    protected function casts(): array
    {
        return [
            'skills' => 'array',
            'experience' => 'array',
            'education' => 'array',
            'companies' => 'array',
            'projects' => 'array',
            'certifications' => 'array',
        ];
    }

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class);
    }
}
