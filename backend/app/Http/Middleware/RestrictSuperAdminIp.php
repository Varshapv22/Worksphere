<?php

namespace App\Http\Middleware;

use App\Models\SuperAdminAllowedIp;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class RestrictSuperAdminIp
{
    /**
     * If any IP allowlist entries exist, the request's IP must be one of
     * them. Deliberately NOT applied to the security-settings routes
     * themselves, so a super admin can never lock themselves out of the
     * one place that manages this list.
     */
    public function handle(Request $request, Closure $next): Response
    {
        if (SuperAdminAllowedIp::query()->exists()) {
            abort_unless(
                SuperAdminAllowedIp::where('ip_address', $request->ip())->exists(),
                403,
                'Your IP address is not allowed to access platform management.'
            );
        }

        return $next($request);
    }
}
