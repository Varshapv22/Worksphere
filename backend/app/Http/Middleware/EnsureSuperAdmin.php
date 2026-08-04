<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureSuperAdmin
{
    /**
     * Restrict platform-management routes to the central super-admin
     * account (tenant company-admins/managers/employees are never allowed
     * through, regardless of their Spatie permissions).
     */
    public function handle(Request $request, Closure $next): Response
    {
        abort_unless($request->user()?->is_super_admin, 403, 'Super admin access required.');

        return $next($request);
    }
}
