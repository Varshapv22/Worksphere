<?php

namespace App\Http\Controllers\Api;

use App\Models\ComplianceItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplianceController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = ComplianceItem::where('company_id', $request->user()->company_id)
            ->with('employee:id,first_name,last_name');

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }
        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }
        if ($request->filled('employee_id')) {
            $query->where('employee_id', $request->integer('employee_id'));
        }

        $items = $query->orderBy('expiry_date')->paginate($request->integer('per_page', 20));

        return response()->json([
            'data' => $items->map(fn (ComplianceItem $i) => $this->resource($i)),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page'    => $items->lastPage(),
                'total'        => $items->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'employee_id'     => ['nullable', 'integer', 'exists:employees,id'],
            'type'            => ['required', 'in:passport,visa,certification,insurance,medical,drivers_license,contract,other'],
            'name'            => ['required', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:100'],
            'issue_date'      => ['nullable', 'date'],
            'expiry_date'     => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ]);

        $item = new ComplianceItem(array_merge($data, [
            'company_id' => $request->user()->company_id,
        ]));
        $item->recalculateStatus();
        $item->save();

        $item->load('employee:id,first_name,last_name');

        return response()->json(['data' => $this->resource($item)], 201);
    }

    public function update(Request $request, ComplianceItem $complianceItem): JsonResponse
    {
        $data = $request->validate([
            'employee_id'     => ['nullable', 'integer', 'exists:employees,id'],
            'type'            => ['sometimes', 'in:passport,visa,certification,insurance,medical,drivers_license,contract,other'],
            'name'            => ['sometimes', 'string', 'max:255'],
            'document_number' => ['nullable', 'string', 'max:100'],
            'issue_date'      => ['nullable', 'date'],
            'expiry_date'     => ['nullable', 'date'],
            'notes'           => ['nullable', 'string'],
        ]);

        $complianceItem->fill($data);
        $complianceItem->recalculateStatus();
        $complianceItem->save();

        $complianceItem->load('employee:id,first_name,last_name');

        return response()->json(['data' => $this->resource($complianceItem)]);
    }

    public function destroy(ComplianceItem $complianceItem): JsonResponse
    {
        $complianceItem->delete();
        return response()->json(null, 204);
    }

    public function summary(Request $request): JsonResponse
    {
        $companyId = $request->user()->company_id;

        $counts = ComplianceItem::where('company_id', $companyId)
            ->selectRaw('status, count(*) as total')
            ->groupBy('status')
            ->pluck('total', 'status');

        $byType = ComplianceItem::where('company_id', $companyId)
            ->selectRaw('type, count(*) as total')
            ->groupBy('type')
            ->pluck('total', 'type');

        return response()->json([
            'data' => [
                'by_status' => $counts,
                'by_type'   => $byType,
                'total'     => $counts->sum(),
            ],
        ]);
    }

    private function resource(ComplianceItem $i): array
    {
        return [
            'id'              => $i->id,
            'type'            => $i->type,
            'name'            => $i->name,
            'document_number' => $i->document_number,
            'issue_date'      => $i->issue_date?->toDateString(),
            'expiry_date'     => $i->expiry_date?->toDateString(),
            'status'          => $i->status,
            'notes'           => $i->notes,
            'employee'        => $i->employee ? [
                'id'        => $i->employee->id,
                'full_name' => $i->employee->full_name,
            ] : null,
            'days_until_expiry' => $i->expiry_date ? now()->diffInDays($i->expiry_date, false) : null,
            'created_at'      => $i->created_at?->toIso8601String(),
        ];
    }
}
