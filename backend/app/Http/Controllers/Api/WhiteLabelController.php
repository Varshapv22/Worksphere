<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\WhiteLabelConfig;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class WhiteLabelController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage branding.');

        $config = WhiteLabelConfig::firstOrNew(
            ['company_id' => $request->user()->company_id]
        );

        return response()->json(['data' => $this->resource($config)]);
    }

    public function update(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage branding.');

        $data = $request->validate([
            'app_name'        => ['nullable', 'string', 'max:100'],
            'logo_url'        => ['nullable', 'url', 'max:500'],
            'favicon_url'     => ['nullable', 'url', 'max:500'],
            'primary_color'   => ['nullable', 'string', 'max:20', 'regex:/^#[0-9a-fA-F]{3,8}$/'],
            'secondary_color' => ['nullable', 'string', 'max:20', 'regex:/^#[0-9a-fA-F]{3,8}$/'],
            'login_message'   => ['nullable', 'string', 'max:500'],
            'support_email'   => ['nullable', 'email', 'max:255'],
            'custom_domain'   => ['nullable', 'string', 'max:255'],
            'email_footer'    => ['nullable', 'array'],
        ]);

        $config = WhiteLabelConfig::updateOrCreate(
            ['company_id' => $request->user()->company_id],
            $data
        );

        return response()->json(['data' => $this->resource($config)]);
    }

    private function resource(WhiteLabelConfig $c): array
    {
        return [
            'app_name'        => $c->app_name,
            'logo_url'        => $c->logo_url,
            'favicon_url'     => $c->favicon_url,
            'primary_color'   => $c->primary_color,
            'secondary_color' => $c->secondary_color,
            'login_message'   => $c->login_message,
            'support_email'   => $c->support_email,
            'custom_domain'   => $c->custom_domain,
            'email_footer'    => $c->email_footer,
        ];
    }
}
