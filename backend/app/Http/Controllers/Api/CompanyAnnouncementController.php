<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCompanyAnnouncementRequest;
use App\Http\Requests\UpdateCompanyAnnouncementRequest;
use App\Http\Resources\AnnouncementResource;
use App\Http\Resources\CompanyAnnouncementResource;
use App\Models\CompanyAnnouncement;
use Illuminate\Http\Request;

class CompanyAnnouncementController extends Controller
{
    /**
     * This company's own announcements, active right now, for the popup
     * every employee sees — no permission gate, any authenticated tenant
     * user can view it.
     */
    public function active(Request $request)
    {
        $announcements = CompanyAnnouncement::activeNow()
            ->orderByDesc('created_at')
            ->get();

        return AnnouncementResource::collection($announcements);
    }

    public function index()
    {
        $this->authorize('viewAny', CompanyAnnouncement::class);

        $announcements = CompanyAnnouncement::query()->orderByDesc('created_at')->get();

        return CompanyAnnouncementResource::collection($announcements);
    }

    public function store(StoreCompanyAnnouncementRequest $request)
    {
        $announcement = CompanyAnnouncement::create([
            ...$request->validated(),
            'created_by' => $request->user()->id,
        ]);

        return new CompanyAnnouncementResource($announcement);
    }

    public function update(UpdateCompanyAnnouncementRequest $request, CompanyAnnouncement $companyAnnouncement)
    {
        $companyAnnouncement->update($request->validated());

        return new CompanyAnnouncementResource($companyAnnouncement->fresh());
    }

    public function destroy(CompanyAnnouncement $companyAnnouncement)
    {
        $this->authorize('delete', $companyAnnouncement);

        $companyAnnouncement->delete();

        return response()->json(null, 204);
    }
}
