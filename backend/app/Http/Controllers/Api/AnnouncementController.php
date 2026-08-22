<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AnnouncementResource;
use App\Models\Announcement;
use Illuminate\Http\Request;

class AnnouncementController extends Controller
{
    /**
     * Announcements currently visible to the authenticated tenant.
     */
    public function active(Request $request)
    {
        $announcements = Announcement::activeFor($request->user()->company_id)
            ->orderByDesc('created_at')
            ->get();

        return AnnouncementResource::collection($announcements);
    }
}
