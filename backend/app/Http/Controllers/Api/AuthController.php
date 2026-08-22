<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AdminActivityLog;
use App\Models\Company;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use PragmaRX\Google2FA\Google2FA;
use Spatie\Permission\Models\Role;

class AuthController extends Controller
{
    /**
     * Register a brand-new tenant (company) plus its first company-admin user.
     */
    public function registerCompany(Request $request)
    {
        $validated = $request->validate([
            'company_name' => ['required', 'string', 'max:255'],
            'company_slug' => ['required', 'string', 'max:255', 'alpha_dash', Rule::unique('companies', 'slug')],
            'company_email' => ['required', 'email', 'max:255'],
            'admin_name' => ['required', 'string', 'max:255'],
            'admin_email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'admin_password' => ['required', 'string', 'min:8'],
        ]);

        [$user, $company] = DB::transaction(function () use ($validated) {
            // New tenants start pending - a super admin must approve them
            // before anyone can log in (see login() below).
            $company = Company::create([
                'name' => $validated['company_name'],
                'slug' => $validated['company_slug'],
                'email' => $validated['company_email'],
                'status' => 'pending',
            ]);

            $user = User::create([
                'name' => $validated['admin_name'],
                'email' => $validated['admin_email'],
                'password' => Hash::make($validated['admin_password']),
                'company_id' => $company->id,
            ]);

            setPermissionsTeamId($company->id);

            $role = Role::firstOrCreate([
                'name' => 'company-admin',
                'guard_name' => 'web',
            ]);

            $user->assignRole($role);

            return [$user, $company];
        });

        // No token is issued here - the account can't sign in until an
        // admin approves the company.
        return response()->json([
            'message' => 'Registration submitted. An administrator will review your company shortly.',
            'company' => $company,
        ], 201);
    }

    /**
     * Authenticate an existing user and issue a Sanctum token.
     */
    public function login(Request $request)
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (! Auth::attempt($credentials)) {
            return response()->json([
                'message' => 'The provided credentials are incorrect.',
            ], 422);
        }

        /** @var User $user */
        $user = Auth::user();

        if (! $user->is_super_admin && $user->company_id) {
            $company = $user->company;

            if ($company->status === 'pending') {
                return response()->json([
                    'message' => 'Your company registration is still pending admin approval.',
                    'company_status' => 'pending',
                ], 403);
            }

            if ($company->status === 'rejected') {
                return response()->json([
                    'message' => 'Your company registration was not approved. Please contact support.',
                    'company_status' => 'rejected',
                ], 403);
            }

            if (! $company->is_active) {
                return response()->json([
                    'message' => 'Your company account has been suspended. Please contact support.',
                    'company_status' => 'suspended',
                ], 403);
            }
        }

        if ($user->is_super_admin && $user->hasTwoFactorEnabled()) {
            $challenge = Str::random(40);
            Cache::put("2fa_challenge:{$challenge}", $user->id, now()->addMinutes(5));

            return response()->json([
                'requires_2fa' => true,
                'challenge' => $challenge,
            ]);
        }

        return response()->json($this->issueSession($user));
    }

    /**
     * Complete login for a super admin with 2FA enabled: verify the TOTP
     * code (or a recovery code) against the challenge from login().
     */
    public function verifyTwoFactor(Request $request)
    {
        $validated = $request->validate([
            'challenge' => ['required', 'string'],
            'code' => ['required', 'string'],
        ]);

        $userId = Cache::get("2fa_challenge:{$validated['challenge']}");

        if (! $userId) {
            return response()->json(['message' => 'This login attempt has expired. Please sign in again.'], 422);
        }

        $user = User::findOrFail($userId);
        $google2fa = new Google2FA;

        $validCode = $google2fa->verifyKey($user->two_factor_secret, $validated['code']);
        $validRecovery = in_array($validated['code'], $user->two_factor_recovery_codes ?? [], true);

        if (! $validCode && ! $validRecovery) {
            return response()->json(['message' => 'Invalid code.'], 422);
        }

        Cache::forget("2fa_challenge:{$validated['challenge']}");

        if ($validRecovery) {
            $user->update([
                'two_factor_recovery_codes' => array_values(array_diff($user->two_factor_recovery_codes, [$validated['code']])),
            ]);
        }

        return response()->json($this->issueSession($user));
    }

    /**
     * @return array<string, mixed>
     */
    private function issueSession(User $user): array
    {
        $token = $user->createToken('api')->plainTextToken;

        if ($user->is_super_admin) {
            AdminActivityLog::record('auth.login', null, [], $user->name);
        }

        $user->load('employee');
        setPermissionsTeamId($user->company_id);

        return [
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
            'token' => $token,
        ];
    }

    /**
     * Revoke the token used for the current request.
     */
    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    /**
     * Return the authenticated user with company + roles/permissions loaded.
     */
    public function me(Request $request)
    {
        $user = $request->user()->load('company', 'employee');

        return response()->json([
            'user' => $user,
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name'),
        ]);
    }

    /**
     * Update the authenticated user's own name/email, and optionally their
     * password (requires the current password to confirm identity).
     */
    public function updateProfile(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'current_password' => ['required_with:new_password', 'string'],
            'new_password' => ['sometimes', 'string', 'min:8', 'confirmed'],
        ]);

        if (isset($validated['new_password'])) {
            if (! Hash::check($validated['current_password'], $user->password)) {
                throw ValidationException::withMessages([
                    'current_password' => 'The current password is incorrect.',
                ]);
            }
            $user->password = Hash::make($validated['new_password']);
        }

        if (isset($validated['name'])) {
            $user->name = $validated['name'];
        }
        if (isset($validated['email'])) {
            $user->email = $validated['email'];
        }

        $user->save();

        return response()->json(['user' => $user->fresh()->load('company')]);
    }
}
