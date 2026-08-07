<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('modules')->updateOrInsert(
            ['slug' => 'knowledge-base'],
            [
                'name'         => 'Knowledge Base',
                'slug'         => 'knowledge-base',
                'description'  => 'Centralised repository of company policies, SOPs, technical guides, FAQs, and onboarding documents.',
                'icon'         => 'BookOpen',
                'category'     => 'Communication',
                'sort_order'   => 11,
                'is_active'    => true,
                'is_available' => true,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]
        );

        DB::table('modules')->updateOrInsert(
            ['slug' => 'recognition'],
            [
                'name'         => 'Employee Recognition',
                'slug'         => 'recognition',
                'description'  => 'Award badges and celebrate employee achievements across the company.',
                'icon'         => 'Award',
                'category'     => 'People',
                'sort_order'   => 12,
                'is_active'    => true,
                'is_available' => true,
                'created_at'   => $now,
                'updated_at'   => $now,
            ]
        );
    }

    public function down(): void
    {
        DB::table('modules')->whereIn('slug', ['knowledge-base', 'recognition'])->delete();
    }
};
