<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminSubscriptionPlanResource;
use App\Models\AdminActivityLog;
use App\Models\SubscriptionPlan;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class SubscriptionPlanController extends Controller
{
    public function index()
    {
        $plans = SubscriptionPlan::withCount('companies')->orderBy('price_monthly')->get();

        return AdminSubscriptionPlanResource::collection($plans);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $plan = SubscriptionPlan::create($validated);

        AdminActivityLog::record('subscription_plan.create', $plan, ['after' => $validated], $plan->name);

        return new AdminSubscriptionPlanResource($plan->loadCount('companies'));
    }

    public function update(Request $request, SubscriptionPlan $subscriptionPlan)
    {
        $validated = $this->validated($request, $subscriptionPlan->id);

        $before = $subscriptionPlan->only(array_keys($validated));
        $subscriptionPlan->update($validated);

        AdminActivityLog::record('subscription_plan.update', $subscriptionPlan, ['before' => $before, 'after' => $validated], $subscriptionPlan->name);

        return new AdminSubscriptionPlanResource($subscriptionPlan->fresh()->loadCount('companies'));
    }

    public function destroy(SubscriptionPlan $subscriptionPlan)
    {
        if ($subscriptionPlan->companies()->exists()) {
            throw ValidationException::withMessages([
                'plan' => 'This plan has companies subscribed to it and cannot be deleted.',
            ]);
        }

        $name = $subscriptionPlan->name;
        $subscriptionPlan->delete();

        AdminActivityLog::record('subscription_plan.delete', $subscriptionPlan, [], $name);

        return response()->noContent();
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', Rule::unique('subscription_plans', 'slug')->ignore($ignoreId)],
            'price_monthly' => ['required', 'numeric', 'min:0'],
            'max_employees' => ['required', 'integer', 'min:0'],
            'features' => ['nullable', 'array'],
            'features.*' => ['string'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
