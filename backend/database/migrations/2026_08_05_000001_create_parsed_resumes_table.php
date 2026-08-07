<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parsed_resumes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->string('file_name');
            $table->string('file_path')->nullable();
            $table->enum('status', ['processing', 'completed', 'failed'])->default('processing');
            $table->string('error_message')->nullable();

            // Extracted candidate info
            $table->string('candidate_name')->nullable();
            $table->string('email')->nullable();
            $table->string('phone')->nullable();
            $table->text('summary')->nullable();

            // Structured sections stored as JSON
            $table->json('skills')->nullable();
            $table->json('experience')->nullable();
            $table->json('education')->nullable();
            $table->json('companies')->nullable();
            $table->json('projects')->nullable();
            $table->json('certifications')->nullable();

            $table->longText('raw_text')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parsed_resumes');
    }
};
