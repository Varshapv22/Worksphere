<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WorkingHourConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WorkingHourConfigController extends Controller
{
    /**
     * The company's working-hours config, lazily created with sane defaults
     * the first time anyone asks (mirrors how leave balances are seeded).
     */
    public function show(Request $request): JsonResponse
    {
        $config = WorkingHourConfig::firstOrCreate(
            ['company_id' => $request->user()->company_id],
            ['work_days' => ['mon', 'tue', 'wed', 'thu', 'fri']]
        );

        // firstOrCreate only hydrates the attributes it was given - the
        // decimal/time columns' DB-level defaults aren't reflected on a
        // freshly created row until it's re-read.
        if ($config->wasRecentlyCreated) {
            $config->refresh();
        }

        return response()->json(['data' => $config]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage working-hours configuration.');

        $data = $request->validate([
            'work_start_time' => ['required', 'date_format:H:i'],
            'work_end_time' => ['required', 'date_format:H:i', 'after:work_start_time'],
            'standard_hours_per_day' => ['required', 'numeric', 'min:0', 'max:24'],
            'late_grace_minutes' => ['required', 'integer', 'min:0', 'max:240'],
            'half_day_threshold_hours' => ['required', 'numeric', 'min:0', 'max:24'],
            'work_days' => ['required', 'array', 'min:1'],
            'work_days.*' => ['string', 'in:mon,tue,wed,thu,fri,sat,sun'],
        ]);

        $config = WorkingHourConfig::updateOrCreate(
            ['company_id' => $request->user()->company_id],
            $data
        );

        return response()->json(['data' => $config]);
    }
}
