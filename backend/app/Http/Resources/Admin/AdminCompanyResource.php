<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $maxEmployees = $this->subscriptionPlan?->max_employees ?? 0;
        $employeeCount = $this->employees_count ?? 0;

        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'email' => $this->email,
            'is_active' => $this->is_active,
            'status' => $this->status,
            'trial_ends_at' => $this->trial_ends_at,
            'employee_count' => $employeeCount,
            'subscription_plan' => $this->whenLoaded('subscriptionPlan', fn () => $this->subscriptionPlan ? [
                'id' => $this->subscriptionPlan->id,
                'name' => $this->subscriptionPlan->name,
                'slug' => $this->subscriptionPlan->slug,
                'price_monthly' => $this->subscriptionPlan->price_monthly,
                'max_employees' => $this->subscriptionPlan->max_employees,
            ] : null),
            'usage_percent' => $maxEmployees > 0 ? round(($employeeCount / $maxEmployees) * 100, 1) : null,
            'created_at' => $this->created_at,
        ];
    }
}
