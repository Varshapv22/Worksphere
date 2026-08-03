<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\SubscriptionPlan>
 */
class SubscriptionPlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $name = fake()->unique()->randomElement(['Starter', 'Growth', 'Business', 'Enterprise']).' '.fake()->unique()->numberBetween(1, 99999);

        return [
            'name' => $name,
            'slug' => Str::slug($name),
            'price_monthly' => fake()->randomElement([0, 29, 99, 299]),
            'max_employees' => fake()->randomElement([10, 50, 200, 1000]),
            'features' => ['payroll' => false, 'attendance' => true, 'leave' => true],
            'is_active' => true,
        ];
    }
}
