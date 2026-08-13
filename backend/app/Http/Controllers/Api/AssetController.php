<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\Asset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AssetController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = Asset::where('company_id', $request->user()->company_id)
            ->with('assignedEmployee:id,first_name,last_name');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('search')) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                  ->orWhere('serial_number', 'like', "%{$request->search}%");
            });
        }

        $assets = $query->orderByDesc('created_at')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => $assets->map(fn (Asset $a) => $this->resource($a)),
            'meta' => [
                'current_page' => $assets->currentPage(),
                'last_page'    => $assets->lastPage(),
                'total'        => $assets->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'            => ['required', 'string', 'max:255'],
            'type'            => ['nullable', 'string', 'max:100'],
            'serial_number'   => ['nullable', 'string', 'max:100'],
            'brand'           => ['nullable', 'string', 'max:100'],
            'model'           => ['nullable', 'string', 'max:100'],
            'purchase_date'   => ['nullable', 'date'],
            'purchase_cost'   => ['nullable', 'numeric', 'min:0'],
            'warranty_expiry' => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ]);

        $asset = Asset::create(array_merge($data, [
            'company_id' => $request->user()->company_id,
            'status'     => 'purchased',
        ]));

        return response()->json(['data' => $this->resource($asset)], 201);
    }

    public function show(Asset $asset): JsonResponse
    {
        $asset->load('assignedEmployee:id,first_name,last_name');
        return response()->json(['data' => $this->resource($asset)]);
    }

    public function update(Request $request, Asset $asset): JsonResponse
    {
        $data = $request->validate([
            'name'            => ['sometimes', 'string', 'max:255'],
            'type'            => ['nullable', 'string', 'max:100'],
            'serial_number'   => ['nullable', 'string', 'max:100'],
            'brand'           => ['nullable', 'string', 'max:100'],
            'model'           => ['nullable', 'string', 'max:100'],
            'purchase_date'   => ['nullable', 'date'],
            'purchase_cost'   => ['nullable', 'numeric', 'min:0'],
            'warranty_expiry' => ['nullable', 'date'],
            'status'          => ['sometimes', 'in:purchased,assigned,maintenance,returned,disposed'],
            'assigned_to'     => ['nullable', 'integer', 'exists:employees,id'],
            'assigned_date'   => ['nullable', 'date'],
            'returned_date'   => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ]);

        $asset->update($data);
        $asset->load('assignedEmployee:id,first_name,last_name');

        return response()->json(['data' => $this->resource($asset)]);
    }

    public function destroy(Asset $asset): JsonResponse
    {
        $asset->delete();
        return response()->json(null, 204);
    }

    public function stats(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $counts = Asset::where('company_id', $companyId)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $warrantyExpiringSoon = Asset::where('company_id', $companyId)
            ->whereNotNull('warranty_expiry')
            ->where('warranty_expiry', '>=', now())
            ->where('warranty_expiry', '<=', now()->addDays(30))
            ->count();

        return response()->json([
            'data' => [
                'by_status'              => $counts,
                'total'                  => $counts->sum(),
                'warranty_expiring_soon' => $warrantyExpiringSoon,
            ],
        ]);
    }

    private function resource(Asset $a): array
    {
        return [
            'id'              => $a->id,
            'name'            => $a->name,
            'type'            => $a->type,
            'serial_number'   => $a->serial_number,
            'brand'           => $a->brand,
            'model'           => $a->model,
            'purchase_date'   => $a->purchase_date?->toDateString(),
            'purchase_cost'   => $a->purchase_cost,
            'warranty_expiry' => $a->warranty_expiry?->toDateString(),
            'status'          => $a->status,
            'assigned_to'     => $a->assignedEmployee ? [
                'id'        => $a->assignedEmployee->id,
                'full_name' => $a->assignedEmployee->full_name,
            ] : null,
            'assigned_date'  => $a->assigned_date?->toDateString(),
            'returned_date'  => $a->returned_date?->toDateString(),
            'notes'          => $a->notes,
            'created_at'     => $a->created_at?->toIso8601String(),
        ];
    }
}
