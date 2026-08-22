<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InvoiceResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'amount' => $this->amount,
            'currency' => $this->currency,
            'period_start' => $this->period_start,
            'period_end' => $this->period_end,
            'status' => $this->status,
            'upi_reference' => $this->upi_reference,
            'submitted_at' => $this->submitted_at,
            'paid_at' => $this->paid_at,
            'notes' => $this->notes,
            'company' => $this->whenLoaded('company', fn () => $this->company ? [
                'id' => $this->company->id,
                'name' => $this->company->name,
            ] : null),
            'subscription_plan' => $this->whenLoaded('subscriptionPlan', fn () => $this->subscriptionPlan ? [
                'id' => $this->subscriptionPlan->id,
                'name' => $this->subscriptionPlan->name,
            ] : null),
            'created_at' => $this->created_at,
        ];
    }
}
