<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminAnnouncementResource;
use App\Models\AdminActivityLog;
use App\Models\Announcement;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AnnouncementController extends Controller
{
    public function index()
    {
        $announcements = Announcement::with('companies')->orderByDesc('created_at')->get();

        return AdminAnnouncementResource::collection($announcements);
    }

    public function store(Request $request)
    {
        $validated = $this->validated($request);

        $announcement = Announcement::create($validated);
        if ($validated['audience_type'] === 'specific') {
            $announcement->companies()->sync($validated['company_ids'] ?? []);
        }

        AdminActivityLog::record('announcement.create', $announcement, ['after' => $validated], $announcement->title);

        return new AdminAnnouncementResource($announcement->load('companies'));
    }

    public function update(Request $request, Announcement $announcement)
    {
        $validated = $this->validated($request);

        $before = $announcement->only(array_keys($validated));
        $announcement->update($validated);
        $announcement->companies()->sync($validated['audience_type'] === 'specific' ? ($validated['company_ids'] ?? []) : []);

        AdminActivityLog::record('announcement.update', $announcement, ['before' => $before, 'after' => $validated], $announcement->title);

        return new AdminAnnouncementResource($announcement->fresh()->load('companies'));
    }

    public function destroy(Announcement $announcement)
    {
        $title = $announcement->title;
        $announcement->delete();

        AdminActivityLog::record('announcement.delete', $announcement, [], $title);

        return response()->noContent();
    }

    private function validated(Request $request): array
    {
        return $request->validate([
            'title' => ['required', 'string', 'max:255'],
            'body' => ['required', 'string'],
            'level' => ['required', Rule::in(['info', 'warning', 'critical'])],
            'audience_type' => ['required', Rule::in(['all', 'specific'])],
            'company_ids' => ['sometimes', 'array'],
            'company_ids.*' => ['integer', Rule::exists('companies', 'id')],
            'starts_at' => ['nullable', 'date'],
            'ends_at' => ['nullable', 'date', 'after_or_equal:starts_at'],
            'is_active' => ['sometimes', 'boolean'],
        ]);
    }
}
