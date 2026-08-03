<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreDesignationRequest;
use App\Http\Requests\UpdateDesignationRequest;
use App\Http\Resources\DesignationResource;
use App\Models\Designation;
use Illuminate\Http\Request;

class DesignationController extends Controller
{
    public function index(Request $request)
    {
        $designations = Designation::query()
            ->with('department')
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->paginate($request->integer('per_page', 15));

        return DesignationResource::collection($designations);
    }

    public function store(StoreDesignationRequest $request)
    {
        $designation = Designation::create($request->validated());

        return new DesignationResource($designation->fresh('department'));
    }

    public function show(Designation $designation)
    {
        return new DesignationResource($designation->load('department'));
    }

    public function update(UpdateDesignationRequest $request, Designation $designation)
    {
        $designation->update($request->validated());

        return new DesignationResource($designation->fresh('department'));
    }

    public function destroy(Designation $designation)
    {
        $this->authorize('departments.manage');

        $designation->delete();

        return response()->json(null, 204);
    }
}
