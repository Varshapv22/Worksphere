<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Company;
use Illuminate\Http\Request;

class ImpersonationController extends Controller
{
    /**
     * Issue a token for the company's admin so a super admin can see
     * exactly what they see, for support/debugging. Logged for audit.
     */
    public function start(Request $request, Company $company)
    {
        setPermissionsTeamId($company->id);
        $admin = $company->users()->get()->first(fn ($user) => $user->hasRole('company-admin'));

        abort_unless($admin, 404, 'This company has no admin user to impersonate.');

        $token = $admin->createToken('impersonation', ['impersonation'])->plainTextToken;

        AdminActivityLog::record(
            'company.impersonate',
            $company,
            ['as_user_id' => $admin->id, 'as_user_email' => $admin->email],
            $company->name
        );

        $admin->load('employee');
        setPermissionsTeamId($admin->company_id);

        return response()->json([
            'user' => $admin,
            'roles' => $admin->getRoleNames(),
            'permissions' => $admin->getAllPermissions()->pluck('name'),
            'token' => $token,
        ]);
    }
}
