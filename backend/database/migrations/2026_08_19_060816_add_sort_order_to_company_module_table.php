<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Null = no custom order set yet for this company, fall back to the
        // module's platform-wide sort_order. Lets a super admin drag a
        // specific company's active modules into their own order without
        // affecting anyone else's.
        Schema::table('company_module', function (Blueprint $table) {
            $table->unsignedInteger('sort_order')->nullable()->after('is_granted');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_module', function (Blueprint $table) {
            $table->dropColumn('sort_order');
        });
    }
};
