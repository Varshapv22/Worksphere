<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\FeatureFlag;
use Illuminate\Http\Request;

class FeatureFlagController extends Controller
{
    /**
     * Flags enabled for the current tenant - global default, unless this
     * company has an explicit override.
     */
    public function active(Request $request)
    {
        $company = $request->user()->company;
        $overrides = $company ? $company->featureFlags()->get()->keyBy('id') : collect();

        $enabled = FeatureFlag::all()->filter(function (FeatureFlag $flag) use ($overrides) {
            $override = $overrides->get($flag->id);

            return $override !== null ? (bool) $override->pivot->is_enabled : $flag->is_enabled_globally;
        })->pluck('key')->values();

        return response()->json(['data' => $enabled]);
    }
}
