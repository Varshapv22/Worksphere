<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveBalanceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'leave_type' => $this->whenLoaded('leaveType', fn () => $this->leaveType?->name),
            'year' => $this->year,
            'allocated' => (float) $this->allocated,
            'used' => (float) $this->used,
            'remaining' => (float) $this->allocated - (float) $this->used,
        ];
    }
}
