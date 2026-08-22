<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\SupportTicketResource;
use App\Models\AdminActivityLog;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupportTicketController extends Controller
{
    /**
     * Every support ticket across every tenant.
     */
    public function index(Request $request)
    {
        $query = SupportTicket::with(['company', 'createdBy'])->orderByDesc('updated_at');

        if ($request->filled('status')) {
            $query->where('status', $request->string('status'));
        }

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->integer('company_id'));
        }

        $tickets = $query->paginate($request->integer('per_page', 20));

        return SupportTicketResource::collection($tickets);
    }

    public function show(SupportTicket $ticket)
    {
        return new SupportTicketResource($ticket->load(['company', 'createdBy', 'messages.user']));
    }

    public function reply(Request $request, SupportTicket $ticket)
    {
        $validated = $request->validate(['body' => ['required', 'string']]);

        $ticket->messages()->create(['user_id' => $request->user()->id, 'body' => $validated['body']]);

        if ($ticket->status === 'open') {
            $ticket->update(['status' => 'in_progress']);
        }

        return new SupportTicketResource($ticket->fresh()->load(['company', 'createdBy', 'messages.user']));
    }

    public function updateStatus(Request $request, SupportTicket $ticket)
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
        ]);

        $before = ['status' => $ticket->status];
        $ticket->update($validated);

        AdminActivityLog::record('support_ticket.update', $ticket, ['before' => $before, 'after' => $validated], $ticket->subject);

        return new SupportTicketResource($ticket->fresh()->load(['company', 'createdBy', 'messages.user']));
    }
}
