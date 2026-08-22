<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\PlatformSetting;
use Illuminate\Http\Request;

class SettingController extends Controller
{
    /**
     * Platform-wide settings super admins configure - currently just the
     * UPI id/payee name companies pay their subscription into.
     */
    public function index()
    {
        return response()->json([
            'upi_id' => PlatformSetting::get('upi_id'),
            'upi_payee_name' => PlatformSetting::get('upi_payee_name'),
        ]);
    }

    public function update(Request $request)
    {
        $validated = $request->validate([
            'upi_id' => ['nullable', 'string', 'max:255'],
            'upi_payee_name' => ['nullable', 'string', 'max:255'],
        ]);

        foreach ($validated as $key => $value) {
            PlatformSetting::set($key, $value);
        }

        AdminActivityLog::record('settings.update', null, $validated, 'Platform settings');

        return response()->json([
            'upi_id' => PlatformSetting::get('upi_id'),
            'upi_payee_name' => PlatformSetting::get('upi_payee_name'),
        ]);
    }
}
