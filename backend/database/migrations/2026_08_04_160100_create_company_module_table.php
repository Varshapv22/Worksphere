<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('company_module', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->boolean('is_enabled')->default(false);
            $table->timestamp('enabled_at')->nullable();
            $table->timestamps();
            $table->unique(['company_id', 'module_id']);
        });

        // Seed the marketplace catalog. Attendance is the only module with a
        // working API/UI today, so it's the only one marked available; the
        // rest list as "coming soon" until they're built out.
        $now = now();
        $catalog = [
            ['name' => 'Attendance', 'slug' => 'attendance', 'description' => 'Clock in/out tracking and attendance history.', 'icon' => 'Clock', 'category' => 'Core HR', 'sort_order' => 1, 'is_available' => true],
            ['name' => 'Payroll', 'slug' => 'payroll', 'description' => 'Salary runs, deductions, and payslips.', 'icon' => 'Wallet', 'category' => 'Core HR', 'sort_order' => 2, 'is_available' => false],
            ['name' => 'CRM', 'slug' => 'crm', 'description' => 'Track leads, deals, and customer relationships.', 'icon' => 'Handshake', 'category' => 'Sales', 'sort_order' => 3, 'is_available' => false],
            ['name' => 'Project Management', 'slug' => 'project-management', 'description' => 'Plan projects, tasks, and team workloads.', 'icon' => 'Kanban', 'category' => 'Operations', 'sort_order' => 4, 'is_available' => false],
            ['name' => 'Asset Management', 'slug' => 'asset-management', 'description' => 'Track company assets and equipment assignments.', 'icon' => 'Boxes', 'category' => 'Operations', 'sort_order' => 5, 'is_available' => false],
            ['name' => 'Help Desk', 'slug' => 'help-desk', 'description' => 'Internal support tickets and requests.', 'icon' => 'LifeBuoy', 'category' => 'Support', 'sort_order' => 6, 'is_available' => false],
            ['name' => 'Visitor Management', 'slug' => 'visitor-management', 'description' => 'Log and badge visitors at your offices.', 'icon' => 'UserCheck', 'category' => 'Operations', 'sort_order' => 7, 'is_available' => false],
            ['name' => 'Learning', 'slug' => 'learning', 'description' => 'Courses and training for employees.', 'icon' => 'GraduationCap', 'category' => 'People', 'sort_order' => 8, 'is_available' => false],
            ['name' => 'Recruitment', 'slug' => 'recruitment', 'description' => 'Job postings, candidates, and hiring pipelines.', 'icon' => 'UserPlus', 'category' => 'People', 'sort_order' => 9, 'is_available' => false],
        ];

        foreach ($catalog as $module) {
            DB::table('modules')->insert(array_merge($module, [
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]));
        }

        // Every company already relies on attendance today - grandfather
        // them all in as enabled rather than silently pulling it away.
        $attendanceModuleId = DB::table('modules')->where('slug', 'attendance')->value('id');

        DB::table('companies')->pluck('id')->each(function ($companyId) use ($attendanceModuleId, $now) {
            DB::table('company_module')->insert([
                'company_id' => $companyId,
                'module_id' => $attendanceModuleId,
                'is_enabled' => true,
                'enabled_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('company_module');
    }
};
