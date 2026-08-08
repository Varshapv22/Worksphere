<?php

namespace App\Http\Controllers\Api;

use App\Models\Meeting;
use App\Models\MeetingActionItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MeetingController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $meetings = Meeting::where('company_id', $request->user()->company_id)
            ->with(['organizer:id,name', 'actionItems'])
            ->orderByDesc('meeting_at')
            ->paginate($request->integer('per_page', 15));

        return response()->json([
            'data' => $meetings->map(fn (Meeting $m) => $this->meetingResource($m)),
            'meta' => [
                'current_page' => $meetings->currentPage(),
                'last_page'    => $meetings->lastPage(),
                'total'        => $meetings->total(),
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'          => ['required', 'string', 'max:255'],
            'description'    => ['nullable', 'string'],
            'notes'          => ['nullable', 'string'],
            'meeting_at'     => ['required', 'date'],
            'attendee_ids'   => ['nullable', 'array'],
            'action_items'   => ['nullable', 'array'],
            'action_items.*.title'       => ['required', 'string', 'max:255'],
            'action_items.*.description' => ['nullable', 'string'],
            'action_items.*.assignee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'action_items.*.due_date'    => ['nullable', 'date'],
        ]);

        $meeting = Meeting::create([
            'company_id'   => $request->user()->company_id,
            'title'        => $data['title'],
            'description'  => $data['description'] ?? null,
            'notes'        => $data['notes'] ?? null,
            'meeting_at'   => $data['meeting_at'],
            'organizer_id' => $request->user()->id,
            'attendee_ids' => $data['attendee_ids'] ?? [],
        ]);

        foreach ($data['action_items'] ?? [] as $item) {
            $meeting->actionItems()->create([
                'company_id'  => $meeting->company_id,
                'title'       => $item['title'],
                'description' => $item['description'] ?? null,
                'assignee_id' => $item['assignee_id'] ?? null,
                'due_date'    => $item['due_date'] ?? null,
                'status'      => 'open',
            ]);
        }

        $meeting->load(['organizer:id,name', 'actionItems.assignee:id,first_name,last_name']);

        return response()->json(['data' => $this->meetingResource($meeting)], 201);
    }

    public function show(Meeting $meeting): JsonResponse
    {
        $meeting->load(['organizer:id,name', 'actionItems.assignee:id,first_name,last_name']);

        return response()->json(['data' => $this->meetingResource($meeting)]);
    }

    public function update(Request $request, Meeting $meeting): JsonResponse
    {
        $data = $request->validate([
            'title'        => ['sometimes', 'string', 'max:255'],
            'description'  => ['nullable', 'string'],
            'notes'        => ['nullable', 'string'],
            'meeting_at'   => ['sometimes', 'date'],
            'attendee_ids' => ['nullable', 'array'],
        ]);

        $meeting->update($data);
        $meeting->load(['organizer:id,name', 'actionItems.assignee:id,first_name,last_name']);

        return response()->json(['data' => $this->meetingResource($meeting)]);
    }

    public function destroy(Meeting $meeting): JsonResponse
    {
        $meeting->delete();
        return response()->json(null, 204);
    }

    // ── Action Items ──────────────────────────────────────────────────────────

    public function storeActionItem(Request $request, Meeting $meeting): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'due_date'    => ['nullable', 'date'],
        ]);

        $item = $meeting->actionItems()->create(array_merge($data, [
            'company_id' => $meeting->company_id,
            'status'     => 'open',
        ]));

        $item->load('assignee:id,first_name,last_name');

        return response()->json(['data' => $this->actionItemResource($item)], 201);
    }

    public function updateActionItem(Request $request, MeetingActionItem $actionItem): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'assignee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'due_date'    => ['nullable', 'date'],
            'status'      => ['sometimes', 'in:open,in_progress,done'],
        ]);

        if (isset($data['status']) && $data['status'] === 'done' && ! $actionItem->completed_at) {
            $data['completed_at'] = now();
        }

        $actionItem->update($data);
        $actionItem->load('assignee:id,first_name,last_name');

        return response()->json(['data' => $this->actionItemResource($actionItem)]);
    }

    public function destroyActionItem(MeetingActionItem $actionItem): JsonResponse
    {
        $actionItem->delete();
        return response()->json(null, 204);
    }

    // ── Resources ─────────────────────────────────────────────────────────────

    private function meetingResource(Meeting $m): array
    {
        return [
            'id'           => $m->id,
            'title'        => $m->title,
            'description'  => $m->description,
            'notes'        => $m->notes,
            'meeting_at'   => $m->meeting_at?->toIso8601String(),
            'organizer'    => $m->organizer ? ['id' => $m->organizer->id, 'name' => $m->organizer->name] : null,
            'attendee_ids' => $m->attendee_ids ?? [],
            'action_items' => $m->actionItems->map(fn ($i) => $this->actionItemResource($i))->values(),
            'created_at'   => $m->created_at?->toIso8601String(),
        ];
    }

    private function actionItemResource(MeetingActionItem $i): array
    {
        return [
            'id'           => $i->id,
            'meeting_id'   => $i->meeting_id,
            'title'        => $i->title,
            'description'  => $i->description,
            'assignee'     => $i->assignee ? [
                'id'        => $i->assignee->id,
                'full_name' => $i->assignee->full_name,
            ] : null,
            'due_date'     => $i->due_date?->toDateString(),
            'status'       => $i->status,
            'completed_at' => $i->completed_at?->toIso8601String(),
        ];
    }
}
