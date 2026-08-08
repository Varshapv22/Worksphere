<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Feature 12: Career Roadmap ────────────────────────────────────────

        Schema::create('career_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('target_role');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('career_steps', function (Blueprint $table) {
            $table->id();
            $table->foreignId('career_track_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->json('skills_required')->nullable();   // array of skill names
            $table->json('resources')->nullable();          // [{title, url, type}]
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('employee_career_tracks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('career_track_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('current_step')->default(0);  // index of completed steps
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
            $table->unique(['employee_id', 'career_track_id']);
        });

        // ── Feature 13: Meetings & Action Items ──────────────────────────────

        Schema::create('meetings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->timestamp('meeting_at');
            $table->foreignId('organizer_id')->constrained('users')->cascadeOnDelete();
            $table->json('attendee_ids')->nullable();  // array of employee ids
            $table->timestamps();
        });

        Schema::create('meeting_action_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('meeting_id')->constrained()->cascadeOnDelete();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('assignee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('due_date')->nullable();
            $table->enum('status', ['open', 'in_progress', 'done'])->default('open');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });

        // ── Feature 14: Asset Lifecycle ──────────────────────────────────────

        Schema::create('assets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->nullable();            // Laptop, Phone, Vehicle…
            $table->string('serial_number')->nullable();
            $table->string('brand')->nullable();
            $table->string('model')->nullable();
            $table->date('purchase_date')->nullable();
            $table->decimal('purchase_cost', 12, 2)->nullable();
            $table->date('warranty_expiry')->nullable();
            $table->enum('status', ['purchased', 'assigned', 'maintenance', 'returned', 'disposed'])->default('purchased');
            $table->foreignId('assigned_to')->nullable()->constrained('employees')->nullOnDelete();
            $table->date('assigned_date')->nullable();
            $table->date('returned_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Feature 15: Compliance Dashboard ─────────────────────────────────

        Schema::create('compliance_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained()->nullOnDelete();
            $table->enum('type', [
                'passport', 'visa', 'certification', 'insurance',
                'medical', 'drivers_license', 'contract', 'other',
            ])->default('other');
            $table->string('name');
            $table->string('document_number')->nullable();
            $table->date('issue_date')->nullable();
            $table->date('expiry_date')->nullable();
            $table->enum('status', ['valid', 'expiring_soon', 'expired'])->default('valid');
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // ── Feature 18: Multi-Country Payroll Config ──────────────────────────

        Schema::create('payroll_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('country_code', 3);    // ISO 3166-1 alpha-2
            $table->string('country_name');
            $table->string('currency_code', 3);   // ISO 4217
            $table->string('currency_symbol', 10);
            $table->decimal('tax_rate', 5, 2)->default(0);          // %
            $table->decimal('provident_fund_rate', 5, 2)->default(0); // %
            $table->enum('payroll_frequency', ['weekly', 'bi_weekly', 'monthly'])->default('monthly');
            $table->string('timezone')->default('UTC');
            $table->json('holidays')->nullable();   // [{name, date}]
            $table->json('tax_brackets')->nullable(); // [{min, max, rate}]
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['company_id', 'country_code']);
        });

        // ── Feature 19: Developer API (API Keys + Webhooks) ───────────────────

        Schema::create('api_keys', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('key', 80)->unique();
            $table->json('scopes')->nullable();       // ['employees.read', 'leave.write', …]
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_used_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->timestamps();
        });

        Schema::create('webhooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('url');
            $table->json('events');                  // ['employee.created', 'leave.approved', …]
            $table->string('secret', 64)->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamp('last_triggered_at')->nullable();
            $table->unsignedInteger('failure_count')->default(0);
            $table->timestamps();
        });

        // ── Feature 20: White Label ───────────────────────────────────────────

        Schema::create('white_label_configs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete()->unique();
            $table->string('app_name')->nullable();
            $table->string('logo_url')->nullable();
            $table->string('favicon_url')->nullable();
            $table->string('primary_color', 20)->nullable();    // hex
            $table->string('secondary_color', 20)->nullable();
            $table->text('login_message')->nullable();
            $table->string('support_email')->nullable();
            $table->string('custom_domain')->nullable();
            $table->json('email_footer')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('white_label_configs');
        Schema::dropIfExists('webhooks');
        Schema::dropIfExists('api_keys');
        Schema::dropIfExists('payroll_configs');
        Schema::dropIfExists('compliance_items');
        Schema::dropIfExists('assets');
        Schema::dropIfExists('meeting_action_items');
        Schema::dropIfExists('meetings');
        Schema::dropIfExists('employee_career_tracks');
        Schema::dropIfExists('career_steps');
        Schema::dropIfExists('career_tracks');
    }
};
