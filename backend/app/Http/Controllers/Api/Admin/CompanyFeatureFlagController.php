<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Company;
use App\Models\FeatureFlag;
use Illuminate\Http\Request;

class CompanyFeatureFlagController extends Controller
{
    /**
     * The full flag catalog with this company's override state, if any.
     */
    public function index(Company $company)
    {
        $overrides = $company->featureFlags()->get()->keyBy('id');

        $flags = FeatureFlag::orderBy('label')->get()->map(function (FeatureFlag $flag) use ($overrides) {
            $override = $overrides->get($flag->id);

            return [
                'id' => $flag->id,
                'key' => $flag->key,
                'label' => $flag->label,
                'description' => $flag->description,
                'is_enabled_globally' => $flag->is_enabled_globally,
                'has_override' => $override !== null,
                'is_enabled' => $override !== null ? (bool) $override->pivot->is_enabled : $flag->is_enabled_globally,
            ];
        });

        return response()->json(['data' => $flags]);
    }

    /**
     * Set (or clear) this company's override for one flag.
     */
    public function update(Request $request, Company $company, FeatureFlag $featureFlag)
    {
        $validated = $request->validate([
            'is_enabled' => ['nullable', 'boolean'],
        ]);

        if (is_null($validated['is_enabled'] ?? null)) {
            $company->featureFlags()->detach($featureFlag->id);
        } else {
            $company->featureFlags()->syncWithoutDetaching([
                $featureFlag->id => ['is_enabled' => $validated['is_enabled']],
            ]);
        }

        AdminActivityLog::record(
            'feature_flag.company_override',
            $company,
            ['flag' => $featureFlag->key, 'is_enabled' => $validated['is_enabled'] ?? null],
            "{$featureFlag->label} — {$company->name}"
        );

        return response()->json(['message' => 'Updated.']);
    }
}
