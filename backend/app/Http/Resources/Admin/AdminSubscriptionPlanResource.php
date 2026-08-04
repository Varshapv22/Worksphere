<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminSubscriptionPlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'slug' => $this->slug,
            'price_monthly' => $this->price_monthly,
            'max_employees' => $this->max_employees,
            'features' => $this->features,
            'is_active' => $this->is_active,
            'company_count' => $this->when(
                $this->relationLoaded('companies') || isset($this->companies_count),
                fn () => $this->companies_count ?? $this->companies->count()
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
