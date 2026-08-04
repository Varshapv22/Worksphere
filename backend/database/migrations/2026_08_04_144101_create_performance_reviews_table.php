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
        Schema::create('performance_reviews', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained()->cascadeOnDelete();
            $table->foreignId('employee_id')->constrained()->cascadeOnDelete();
            $table->foreignId('reviewer_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('review_period');
            $table->unsignedTinyInteger('communication_rating');
            $table->unsignedTinyInteger('technical_rating');
            $table->unsignedTinyInteger('teamwork_rating');
            $table->unsignedTinyInteger('leadership_rating');
            $table->decimal('overall_score', 3, 2);
            $table->text('summary')->nullable();
            $table->timestamps();

            $table->unique(['employee_id', 'review_period']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('performance_reviews');
    }
};
