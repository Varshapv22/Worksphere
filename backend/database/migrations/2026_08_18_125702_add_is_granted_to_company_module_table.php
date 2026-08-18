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
        // Defaults to true so every existing company-module pairing (and any
        // pairing without a row at all, per the app-level fallback in
        // ModuleController) stays exactly as open as it is today. Super
        // admins opt specific companies OUT of specific modules from here on
        // via Admin > Companies > Modules, rather than this being an
        // opt-in-from-scratch whitelist.
        Schema::table('company_module', function (Blueprint $table) {
            $table->boolean('is_granted')->default(true)->after('is_enabled');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('company_module', function (Blueprint $table) {
            $table->dropColumn('is_granted');
        });
    }
};
