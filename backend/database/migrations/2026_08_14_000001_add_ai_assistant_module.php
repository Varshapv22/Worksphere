<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $now = now();

        DB::table('modules')->updateOrInsert(
            ['slug' => 'ai-assistant'],
            [
                'name' => 'AI Assistant',
                'slug' => 'ai-assistant',
                'description' => 'Chat or talk with an AI assistant that answers questions about employees, attendance, and leave using your live company data.',
                'icon' => 'Bot',
                'category' => 'AI',
                'sort_order' => 19,
                'is_active' => true,
                'is_available' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]
        );
    }

    public function down(): void
    {
        DB::table('modules')->where('slug', 'ai-assistant')->delete();
    }
};
