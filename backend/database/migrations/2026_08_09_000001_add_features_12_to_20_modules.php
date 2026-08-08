<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        $new = [
            [
                'name'         => 'Career Roadmap',
                'slug'         => 'career-roadmap',
                'description'  => 'Define career paths, track employee progression, and recommend learning resources for growth.',
                'icon'         => 'TrendingUp',
                'category'     => 'People',
                'sort_order'   => 13,
                'is_available' => true,
            ],
            [
                'name'         => 'Meetings',
                'slug'         => 'meetings',
                'description'  => 'Create meeting notes, capture decisions, and assign action items with deadlines.',
                'icon'         => 'CalendarCheck',
                'category'     => 'Communication',
                'sort_order'   => 14,
                'is_available' => true,
            ],
            [
                'name'         => 'Compliance',
                'slug'         => 'compliance',
                'description'  => 'Track passport, visa, certification, contract, and insurance expiry dates with automated alerts.',
                'icon'         => 'ShieldCheck',
                'category'     => 'Legal',
                'sort_order'   => 15,
                'is_available' => true,
            ],
            [
                'name'         => 'Analytics',
                'slug'         => 'analytics',
                'description'  => 'Attrition, hiring trends, attendance, leave, payroll growth, and department performance dashboards.',
                'icon'         => 'LineChart',
                'category'     => 'Insights',
                'sort_order'   => 16,
                'is_available' => true,
            ],
            [
                'name'         => 'Developer API',
                'slug'         => 'developer-api',
                'description'  => 'API keys, OAuth tokens, and webhooks so you can integrate WorkSphere with any external system.',
                'icon'         => 'Code2',
                'category'     => 'Platform',
                'sort_order'   => 17,
                'is_available' => true,
            ],
            [
                'name'         => 'White Label',
                'slug'         => 'white-label',
                'description'  => 'Customise logo, brand colours, login page, and email templates for your company.',
                'icon'         => 'Palette',
                'category'     => 'Platform',
                'sort_order'   => 18,
                'is_available' => true,
            ],
        ];

        foreach ($new as $module) {
            DB::table('modules')->updateOrInsert(
                ['slug' => $module['slug']],
                array_merge($module, ['is_active' => true, 'created_at' => $now, 'updated_at' => $now])
            );
        }

        // Mark pre-existing but unbuilt modules as now available.
        DB::table('modules')->where('slug', 'asset-management')->update(['is_available' => true, 'updated_at' => $now]);
        DB::table('modules')->where('slug', 'payroll')->update(['is_available' => true, 'updated_at' => $now]);
    }

    public function down(): void
    {
        DB::table('modules')->whereIn('slug', [
            'career-roadmap', 'meetings', 'compliance', 'analytics', 'developer-api', 'white-label',
        ])->delete();

        DB::table('modules')->whereIn('slug', ['asset-management', 'payroll'])
            ->update(['is_available' => false]);
    }
};
