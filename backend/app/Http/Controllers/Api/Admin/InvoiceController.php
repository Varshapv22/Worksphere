<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\AdminActivityLog;
use App\Models\Company;
use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class InvoiceController extends Controller
{
    /**
     * Every invoice on the platform, across all tenants.
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['company', 'subscriptionPlan'])->orderByDesc('created_at');

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->integer('company_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        $invoices = $query->paginate($request->integer('per_page', 20));

        return InvoiceResource::collection($invoices);
    }

    /**
     * Manually generate an invoice for a company's billing period.
     */
    public function store(Request $request, Company $company)
    {
        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0'],
            'currency' => ['sometimes', 'string', 'size:3'],
            'period_start' => ['required', 'date'],
            'period_end' => ['required', 'date', 'after_or_equal:period_start'],
            'notes' => ['nullable', 'string'],
        ]);

        $invoice = $company->invoices()->create($validated + [
            'subscription_plan_id' => $company->subscription_plan_id,
            'currency' => $validated['currency'] ?? $company->currency,
            'status' => 'pending',
            'created_by' => $request->user()->id,
        ]);

        AdminActivityLog::record('invoice.create', $invoice, ['after' => $validated], $company->name);

        return new InvoiceResource($invoice->load(['company', 'subscriptionPlan']));
    }

    /**
     * Verify a submitted UPI payment (mark paid), or mark cancelled/overdue.
     */
    public function update(Request $request, Invoice $invoice)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['paid', 'overdue', 'cancelled'])],
        ]);

        $before = ['status' => $invoice->status];
        $invoice->status = $validated['status'];
        if ($validated['status'] === 'paid') {
            $invoice->paid_at = now();
        }
        $invoice->save();

        AdminActivityLog::record('invoice.update', $invoice, ['before' => $before, 'after' => $validated], $invoice->company->name);

        return new InvoiceResource($invoice->fresh()->load(['company', 'subscriptionPlan']));
    }
}
