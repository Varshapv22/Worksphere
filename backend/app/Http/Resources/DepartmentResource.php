<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DepartmentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'parent_department_id' => $this->parent_department_id,
            'parent_name' => $this->whenLoaded('parent', fn () => $this->parent?->name),
            'manager_employee_id' => $this->manager_employee_id,
            'manager_name' => $this->whenLoaded('manager', fn () => $this->manager?->full_name),
            'children' => DepartmentResource::collection($this->whenLoaded('children')),
            'employees_count' => $this->whenCounted('employees'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
