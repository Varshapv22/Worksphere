<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\PayrollConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PayrollConfigController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can view payroll configuration.');

        $configs = PayrollConfig::where('company_id', $request->user()->company_id)
            ->orderBy('country_name')
            ->get();

        return response()->json(['data' => $configs]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage payroll configuration.');

        $data = $request->validate([
            'country_code'        => ['required', 'string', 'max:3'],
            'country_name'        => ['required', 'string', 'max:100'],
            'currency_code'       => ['required', 'string', 'max:3'],
            'currency_symbol'     => ['required', 'string', 'max:10'],
            'tax_rate'            => ['required', 'numeric', 'min:0', 'max:100'],
            'provident_fund_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payroll_frequency'   => ['required', 'in:weekly,bi_weekly,monthly'],
            'timezone'            => ['nullable', 'string', 'max:100'],
            'holidays'            => ['nullable', 'array'],
            'tax_brackets'        => ['nullable', 'array'],
        ]);

        $config = PayrollConfig::create(array_merge($data, [
            'company_id' => $request->user()->company_id,
        ]));

        return response()->json(['data' => $config], 201);
    }

    public function update(Request $request, PayrollConfig $payrollConfig): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage payroll configuration.');
        abort_unless($payrollConfig->company_id === $request->user()->company_id, 404);

        $data = $request->validate([
            'country_name'        => ['sometimes', 'string', 'max:100'],
            'currency_code'       => ['sometimes', 'string', 'max:3'],
            'currency_symbol'     => ['sometimes', 'string', 'max:10'],
            'tax_rate'            => ['sometimes', 'numeric', 'min:0', 'max:100'],
            'provident_fund_rate' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'payroll_frequency'   => ['sometimes', 'in:weekly,bi_weekly,monthly'],
            'timezone'            => ['nullable', 'string', 'max:100'],
            'holidays'            => ['nullable', 'array'],
            'tax_brackets'        => ['nullable', 'array'],
            'is_active'           => ['sometimes', 'boolean'],
        ]);

        $payrollConfig->update($data);

        return response()->json(['data' => $payrollConfig]);
    }

    public function destroy(Request $request, PayrollConfig $payrollConfig): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage payroll configuration.');
        abort_unless($payrollConfig->company_id === $request->user()->company_id, 404);

        $payrollConfig->delete();
        return response()->json(null, 204);
    }
}
