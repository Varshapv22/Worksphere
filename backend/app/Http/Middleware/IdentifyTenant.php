<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class IdentifyTenant
{
    /**
     * Ensure the authenticated user has tenant context (a company) unless
     * they are a super admin, and scope Spatie's permission "teams" to the
     * current tenant so role/permission checks resolve correctly.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && ! $user->is_super_admin) {
            if (is_null($user->company_id)) {
                abort(403, 'no tenant context');
            }

            $company = $user->company;

            if (! $company || $company->status !== 'approved' || ! $company->is_active) {
                abort(403, 'Your company account is not active. Please contact support.');
            }
        }

        if ($user) {
            setPermissionsTeamId($user->company_id);
        }

        return $next($request);
    }
}
