<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use PragmaRX\Google2FA\Google2FA;

class TwoFactorController extends Controller
{
    public function status(Request $request)
    {
        return response()->json([
            'enabled' => $request->user()->hasTwoFactorEnabled(),
        ]);
    }

    /**
     * Generate a new (unconfirmed) TOTP secret for the current super admin.
     * Nothing is enforced until confirm() verifies a code against it.
     */
    public function setup(Request $request)
    {
        $user = $request->user();
        abort_unless($user->is_super_admin, 403);

        $google2fa = new Google2FA;
        $secret = $google2fa->generateSecretKey();
        $user->update(['two_factor_secret' => $secret, 'two_factor_confirmed_at' => null]);

        return response()->json([
            'secret' => $secret,
            'otpauth_url' => $google2fa->getQRCodeUrl('WorkSphere', $user->email, $secret),
        ]);
    }

    /**
     * Verify a TOTP code against the pending secret and turn 2FA on.
     */
    public function confirm(Request $request)
    {
        $user = $request->user();
        abort_unless($user->is_super_admin, 403);

        $validated = $request->validate(['code' => ['required', 'string']]);

        abort_if(! $user->two_factor_secret, 422, 'Start setup first.');

        $google2fa = new Google2FA;
        abort_unless($google2fa->verifyKey($user->two_factor_secret, $validated['code']), 422, 'Invalid code.');

        $recoveryCodes = collect(range(1, 8))->map(fn () => Str::random(10))->all();

        $user->update([
            'two_factor_confirmed_at' => now(),
            'two_factor_recovery_codes' => $recoveryCodes,
        ]);

        AdminActivityLog::record('security.2fa_enabled', null, [], $user->name);

        return response()->json(['recovery_codes' => $recoveryCodes]);
    }

    public function disable(Request $request)
    {
        $user = $request->user();
        abort_unless($user->is_super_admin, 403);

        $user->update([
            'two_factor_secret' => null,
            'two_factor_confirmed_at' => null,
            'two_factor_recovery_codes' => null,
        ]);

        AdminActivityLog::record('security.2fa_disabled', null, [], $user->name);

        return response()->json(['enabled' => false]);
    }
}
