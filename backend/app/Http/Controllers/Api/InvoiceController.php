<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;

class InvoiceController extends Controller
{
    /**
     * This company's own billing history.
     */
    public function index(Request $request)
    {
        $invoices = $request->user()->company
            ->invoices()
            ->with('subscriptionPlan')
            ->orderByDesc('created_at')
            ->paginate($request->integer('per_page', 20));

        return InvoiceResource::collection($invoices);
    }

    /**
     * Where to send payment - shown alongside the invoice list.
     */
    public function paymentDetails()
    {
        return response()->json([
            'upi_id' => PlatformSetting::get('upi_id'),
            'upi_payee_name' => PlatformSetting::get('upi_payee_name'),
        ]);
    }

    /**
     * Submit a UPI transaction reference against a pending invoice - a
     * super admin still has to verify it before it's marked paid.
     */
    public function submitPayment(Request $request, Invoice $invoice)
    {
        abort_unless($invoice->company_id === $request->user()->company_id, 403);
        abort_unless($request->user()->hasRole('company-admin') || $request->user()->is_super_admin, 403);
        abort_unless($invoice->status === 'pending', 422, 'This invoice is not awaiting payment.');

        $validated = $request->validate([
            'upi_reference' => ['required', 'string', 'max:255'],
        ]);

        $invoice->update([
            'upi_reference' => $validated['upi_reference'],
            'status' => 'submitted',
            'submitted_at' => now(),
        ]);

        return new InvoiceResource($invoice->fresh()->load('subscriptionPlan'));
    }
}
