<?php

namespace Database\Factories;

use App\Models\Company;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Employee>
 */
class EmployeeFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $firstName = fake()->firstName();
        $lastName = fake()->lastName();

        return [
            'company_id' => Company::factory(),
            'user_id' => null,
            'employee_code' => 'EMP-'.fake()->unique()->numberBetween(1000, 999999),
            'department_id' => null,
            'designation_id' => null,
            'manager_id' => null,
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->phoneNumber(),
            'date_of_birth' => fake()->dateTimeBetween('-55 years', '-20 years')->format('Y-m-d'),
            'gender' => fake()->randomElement(['male', 'female', 'other']),
            'date_of_joining' => fake()->dateTimeBetween('-5 years', 'now')->format('Y-m-d'),
            'employment_status' => 'active',
            'address' => ['line1' => fake()->streetAddress(), 'city' => fake()->city(), 'country' => fake()->country()],
            'emergency_contact' => ['name' => fake()->name(), 'phone' => fake()->phoneNumber()],
        ];
    }
}
