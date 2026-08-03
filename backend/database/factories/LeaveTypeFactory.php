<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\LeaveType>
 */
class LeaveTypeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'company_id' => Company::factory(),
            'name' => fake()->unique()->randomElement(['Annual Leave', 'Sick Leave', 'Casual Leave', 'Maternity Leave', 'Unpaid Leave']),
            'days_per_year' => fake()->randomElement([10, 12, 15, 20]),
            'is_paid' => true,
        ];
    }
}
