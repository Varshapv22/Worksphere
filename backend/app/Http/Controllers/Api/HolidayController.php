<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreHolidayRequest;
use App\Http\Resources\HolidayResource;
use App\Models\Holiday;
use Illuminate\Http\Request;

class HolidayController extends Controller
{
    public function index(Request $request)
    {
        $holidays = Holiday::query()->orderBy('date')->get();

        return HolidayResource::collection($holidays);
    }

    public function store(StoreHolidayRequest $request)
    {
        $holiday = Holiday::create($request->validated());

        return new HolidayResource($holiday);
    }

    public function destroy(Holiday $holiday)
    {
        $this->authorize('leave.manage');

        $holiday->delete();

        return response()->json(null, 204);
    }
}
