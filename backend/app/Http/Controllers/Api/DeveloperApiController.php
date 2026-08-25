<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;

use App\Models\ApiKey;
use App\Models\Webhook;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class DeveloperApiController extends Controller
{
    // ── API Keys ──────────────────────────────────────────────────────────────

    public function listKeys(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage API keys.');

        $keys = ApiKey::where('company_id', $request->user()->company_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (ApiKey $k) => $this->keyResource($k));

        return response()->json(['data' => $keys]);
    }

    public function createKey(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage API keys.');

        $data = $request->validate([
            'name'       => ['required', 'string', 'max:100'],
            'scopes'     => ['nullable', 'array'],
            'expires_at' => ['nullable', 'date', 'after:now'],
        ]);

        $rawKey = 'wsk_' . Str::random(60);

        $key = ApiKey::create([
            'company_id' => $request->user()->company_id,
            'name'       => $data['name'],
            'key'        => $rawKey,
            'scopes'     => $data['scopes'] ?? [],
            'expires_at' => $data['expires_at'] ?? null,
            'is_active'  => true,
        ]);

        // Return the raw key only on creation - never shown again.
        return response()->json([
            'data' => array_merge($this->keyResource($key), ['key' => $rawKey]),
        ], 201);
    }

    public function updateKey(Request $request, ApiKey $apiKey): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage API keys.');
        abort_unless($apiKey->company_id === $request->user()->company_id, 404);

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:100'],
            'scopes'    => ['nullable', 'array'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $apiKey->update($data);

        return response()->json(['data' => $this->keyResource($apiKey)]);
    }

    public function revokeKey(Request $request, ApiKey $apiKey): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage API keys.');
        abort_unless($apiKey->company_id === $request->user()->company_id, 404);

        $apiKey->delete();
        return response()->json(null, 204);
    }

    // ── Webhooks ─────────────────────────────────────────────────────────────

    public function listWebhooks(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage webhooks.');

        $webhooks = Webhook::where('company_id', $request->user()->company_id)
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (Webhook $w) => $this->webhookResource($w));

        return response()->json(['data' => $webhooks]);
    }

    public function createWebhook(Request $request): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage webhooks.');

        $data = $request->validate([
            'name'   => ['required', 'string', 'max:100'],
            'url'    => ['required', 'url', 'max:500'],
            'events' => ['required', 'array', 'min:1'],
        ]);

        $secret = 'whsec_' . Str::random(32);

        $webhook = Webhook::create([
            'company_id' => $request->user()->company_id,
            'name'       => $data['name'],
            'url'        => $data['url'],
            'events'     => $data['events'],
            'secret'     => $secret,
            'is_active'  => true,
        ]);

        return response()->json([
            'data' => array_merge($this->webhookResource($webhook), ['secret' => $secret]),
        ], 201);
    }

    public function updateWebhook(Request $request, Webhook $webhook): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage webhooks.');
        abort_unless($webhook->company_id === $request->user()->company_id, 404);

        $data = $request->validate([
            'name'      => ['sometimes', 'string', 'max:100'],
            'url'       => ['sometimes', 'url', 'max:500'],
            'events'    => ['sometimes', 'array', 'min:1'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $webhook->update($data);

        return response()->json(['data' => $this->webhookResource($webhook)]);
    }

    public function deleteWebhook(Request $request, Webhook $webhook): JsonResponse
    {
        abort_unless($request->user()->hasRole('company-admin'), 403, 'Only a company admin can manage webhooks.');
        abort_unless($webhook->company_id === $request->user()->company_id, 404);

        $webhook->delete();
        return response()->json(null, 204);
    }

    public function availableEvents(): JsonResponse
    {
        return response()->json([
            'data' => [
                'employee.created', 'employee.updated', 'employee.terminated',
                'leave.requested', 'leave.approved', 'leave.rejected',
                'attendance.clocked_in', 'attendance.clocked_out',
                'payroll.processed',
                'asset.assigned', 'asset.returned',
                'compliance.expiring',
            ],
        ]);
    }

    // ── Resources ─────────────────────────────────────────────────────────────

    private function keyResource(ApiKey $k): array
    {
        return [
            'id'           => $k->id,
            'name'         => $k->name,
            'key_preview'  => 'wsk_****' . substr($k->key, -6),
            'scopes'       => $k->scopes ?? [],
            'is_active'    => $k->is_active,
            'last_used_at' => $k->last_used_at?->toIso8601String(),
            'expires_at'   => $k->expires_at?->toIso8601String(),
            'created_at'   => $k->created_at?->toIso8601String(),
        ];
    }

    private function webhookResource(Webhook $w): array
    {
        return [
            'id'                => $w->id,
            'name'              => $w->name,
            'url'               => $w->url,
            'events'            => $w->events ?? [],
            'is_active'         => $w->is_active,
            'last_triggered_at' => $w->last_triggered_at?->toIso8601String(),
            'failure_count'     => $w->failure_count,
            'created_at'        => $w->created_at?->toIso8601String(),
        ];
    }
}
