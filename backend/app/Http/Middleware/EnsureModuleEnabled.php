<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureModuleEnabled
{
    public function handle(Request $request, Closure $next, string $slug): Response
    {
        $company = $request->user()?->company;

        abort_unless($company && $company->hasModuleEnabled($slug), 403, 'This module is not enabled for your company.');

        return $next($request);
    }
}
