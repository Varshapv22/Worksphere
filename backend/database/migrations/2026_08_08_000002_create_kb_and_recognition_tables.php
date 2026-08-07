<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Knowledge Base articles ───────────────────────────────────────────
        Schema::create('kb_articles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('category')->default('General');
            $table->longText('body');
            $table->json('tags')->nullable();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_published')->default(true);
            $table->unsignedInteger('views')->default(0);
            $table->timestamps();
        });

        // ── Badges (global, not per-company) ──────────────────────────────────
        Schema::create('badges', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('emoji', 10);
            $table->string('description')->nullable();
            $table->string('color', 30)->default('amber');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Seed predefined badges
        $now = now();
        DB::table('badges')->insert([
            ['name' => 'Team Player',        'emoji' => '🏆', 'description' => 'Outstanding collaboration and teamwork.',          'color' => 'amber',  'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Innovation',         'emoji' => '🚀', 'description' => 'Creative thinking and bringing new ideas to life.', 'color' => 'blue',   'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Leadership',         'emoji' => '🎯', 'description' => 'Guiding and inspiring the team.',                  'color' => 'purple', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Problem Solver',     'emoji' => '💡', 'description' => 'Critical thinking and finding great solutions.',   'color' => 'yellow', 'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Customer Champion',  'emoji' => '👏', 'description' => 'Outstanding customer service and empathy.',        'color' => 'green',  'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Excellence',         'emoji' => '⭐', 'description' => 'Consistently exceptional performance.',            'color' => 'brand',  'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Go-Getter',          'emoji' => '🔥', 'description' => 'Relentless motivation and drive.',                'color' => 'red',    'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
            ['name' => 'Mentor',             'emoji' => '🤝', 'description' => 'Supporting and developing fellow teammates.',      'color' => 'teal',   'is_active' => true, 'created_at' => $now, 'updated_at' => $now],
        ]);

        // ── Employee recognitions ─────────────────────────────────────────────
        Schema::create('employee_recognitions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('awarded_by_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('badge_id')->constrained('badges')->cascadeOnDelete();
            $table->text('message')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_recognitions');
        Schema::dropIfExists('badges');
        Schema::dropIfExists('kb_articles');
    }
};
