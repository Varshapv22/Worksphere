<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // The Resume Parser UI is fully built — mark Recruitment as available.
        DB::table('modules')->where('slug', 'recruitment')->update(['is_available' => true]);

        // Add Skills Matrix module to the marketplace catalog.
        if (! DB::table('modules')->where('slug', 'skills-matrix')->exists()) {
            $now = now();
            DB::table('modules')->insert([
                'name'        => 'Skills Matrix',
                'slug'        => 'skills-matrix',
                'description' => 'Track employee skill proficiency across your workforce and find experts instantly.',
                'icon'        => 'BarChart3',
                'category'    => 'People',
                'sort_order'  => 10,
                'is_active'   => true,
                'is_available'=> true,
                'created_at'  => $now,
                'updated_at'  => $now,
            ]);
        }
    }

    public function down(): void
    {
        DB::table('modules')->where('slug', 'recruitment')->update(['is_available' => false]);
        DB::table('modules')->where('slug', 'skills-matrix')->delete();
    }
};
