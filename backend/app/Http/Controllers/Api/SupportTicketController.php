<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SupportTicketResource;
use App\Models\SupportTicket;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SupportTicketController extends Controller
{
    /**
     * This company's own support tickets.
     */
    public function index(Request $request)
    {
        $tickets = $request->user()->company
            ->supportTickets()
            ->with('createdBy')
            ->orderByDesc('updated_at')
            ->paginate($request->integer('per_page', 20));

        return SupportTicketResource::collection($tickets);
    }

    public function show(Request $request, SupportTicket $ticket)
    {
        abort_unless($ticket->company_id === $request->user()->company_id, 403);

        return new SupportTicketResource($ticket->load(['createdBy', 'messages.user']));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:255'],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'body' => ['required', 'string'],
        ]);

        $ticket = $request->user()->company->supportTickets()->create([
            'created_by' => $request->user()->id,
            'subject' => $validated['subject'],
            'priority' => $validated['priority'] ?? 'normal',
            'status' => 'open',
        ]);

        $ticket->messages()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
        ]);

        return new SupportTicketResource($ticket->load(['createdBy', 'messages.user']));
    }

    public function reply(Request $request, SupportTicket $ticket)
    {
        abort_unless($ticket->company_id === $request->user()->company_id, 403);

        $validated = $request->validate(['body' => ['required', 'string']]);

        $ticket->messages()->create(['user_id' => $request->user()->id, 'body' => $validated['body']]);

        if ($ticket->status === 'resolved' || $ticket->status === 'closed') {
            $ticket->update(['status' => 'open']);
        }

        return new SupportTicketResource($ticket->fresh()->load(['createdBy', 'messages.user']));
    }
}
