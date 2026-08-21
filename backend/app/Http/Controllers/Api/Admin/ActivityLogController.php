<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\Admin\AdminActivityLogResource;
use App\Models\AdminActivityLog;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    /**
     * Audit trail of platform-management actions taken by super admins.
     */
    public function index(Request $request)
    {
        $query = AdminActivityLog::with('admin')->orderByDesc('created_at');

        if ($request->filled('action')) {
            $query->where('action', $request->string('action'));
        }

        if ($request->filled('search')) {
            $search = $request->string('search');
            $query->where(fn ($q) => $q->where('subject_label', 'like', "%{$search}%")
                ->orWhere('action', 'like', "%{$search}%"));
        }

        $logs = $query->paginate($request->integer('per_page', 20));

        return AdminActivityLogResource::collection($logs);
    }
}
