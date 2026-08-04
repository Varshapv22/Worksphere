<?php

namespace App\Http\Resources\Admin;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminModuleResource extends JsonResource
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
            'description' => $this->description,
            'icon' => $this->icon,
            'category' => $this->category,
            'sort_order' => $this->sort_order,
            'is_active' => $this->is_active,
            'is_available' => $this->is_available,
            'enabled_company_count' => $this->when(
                isset($this->enabled_company_count),
                fn () => $this->enabled_company_count
            ),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
