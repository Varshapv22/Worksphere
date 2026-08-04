<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Employee;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\PerformanceReview>
 */
class PerformanceReviewFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $communication = fake()->numberBetween(3, 5);
        $technical = fake()->numberBetween(3, 5);
        $teamwork = fake()->numberBetween(3, 5);
        $leadership = fake()->numberBetween(2, 5);

        $overallScore = round(($communication + $technical + $teamwork + $leadership) / 4, 2);

        return [
            'company_id' => Company::factory(),
            'employee_id' => Employee::factory(),
            'reviewer_id' => null,
            'review_period' => now()->format('Y').'-Q'.ceil(now()->month / 3),
            'communication_rating' => $communication,
            'technical_rating' => $technical,
            'teamwork_rating' => $teamwork,
            'leadership_rating' => $leadership,
            'overall_score' => $overallScore,
            'summary' => fake()->sentence(12),
        ];
    }
}
