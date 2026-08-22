<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminFeatureFlagResource;
use App\Models\AdminActivityLog;
use App\Models\FeatureFlag;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class FeatureFlagController extends Controller
{
    public function index()
    {
        $flags = FeatureFlag::orderBy('label')->get();

        return AdminFeatureFlagResource::collection($flags);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $flag = FeatureFlag::create($validated);

        AdminActivityLog::record('feature_flag.create', $flag, ['after' => $validated], $flag->label);

        return new AdminFeatureFlagResource($flag);
    }

    public function update(Request $request, FeatureFlag $featureFlag)
    {
        $validated = $this->validated($request, $featureFlag->id);

        $before = $featureFlag->only(array_keys($validated));
        $featureFlag->update($validated);

        AdminActivityLog::record('feature_flag.update', $featureFlag, ['before' => $before, 'after' => $validated], $featureFlag->label);

        return new AdminFeatureFlagResource($featureFlag->fresh());
    }

    public function destroy(FeatureFlag $featureFlag)
    {
        $label = $featureFlag->label;
        $featureFlag->delete();

        AdminActivityLog::record('feature_flag.delete', $featureFlag, [], $label);

        return response()->noContent();
    }

    private function validated(Request $request, ?int $ignoreId = null): array
    {
        return $request->validate([
            'key' => ['required', 'string', 'max:255', Rule::unique('feature_flags', 'key')->ignore($ignoreId)],
            'label' => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_enabled_globally' => ['sometimes', 'boolean'],
        ]);
    }
}
