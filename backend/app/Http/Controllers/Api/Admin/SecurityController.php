<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\SuperAdminAllowedIp;
use Illuminate\Http\Request;

class SecurityController extends Controller
{
    /**
     * The IP allowlist for platform-management access. Empty = unrestricted.
     * Deliberately not gated by the 'super-admin-ip' middleware itself, so
     * a super admin can never lock themselves out of managing this list.
     */
    public function index()
    {
        return response()->json([
            'allowed_ips' => SuperAdminAllowedIp::orderByDesc('created_at')->get(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'ip_address' => ['required', 'ip'],
            'label' => ['nullable', 'string', 'max:255'],
        ]);

        $entry = SuperAdminAllowedIp::create($validated + ['created_by' => $request->user()->id]);

        AdminActivityLog::record('security.ip_allow', $entry, $validated, $validated['ip_address']);

        return response()->json($entry, 201);
    }

    public function destroy(Request $request, SuperAdminAllowedIp $allowedIp)
    {
        $ip = $allowedIp->ip_address;
        $allowedIp->delete();

        AdminActivityLog::record('security.ip_revoke', null, ['ip_address' => $ip], $ip);

        return response()->noContent();
    }
}
