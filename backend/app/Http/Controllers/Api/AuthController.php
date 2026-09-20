<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLog;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            AccessLog::create([
                'user_id'    => $user?->id,
                'email'      => $request->email,
                'event'      => 'login_failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            throw ValidationException::withMessages([
                'email' => ['Credenziali non valide.'],
            ]);
        }

        if (!$user->active) {
            AccessLog::create([
                'user_id'    => $user->id,
                'email'      => $user->email,
                'event'      => 'login_failed',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
            ]);
            return response()->json(['message' => 'Account disabilitato.'], 403);
        }

        $token = $user->createToken('api-token')->plainTextToken;

        AccessLog::create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'event'      => 'login_success',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);

        return response()->json([
            'token' => $token,
            'user'  => $user,
        ]);
    }

    public function logout(Request $request)
    {
        $user = $request->user();
        AccessLog::create([
            'user_id'    => $user->id,
            'email'      => $user->email,
            'event'      => 'logout',
            'ip_address' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
        $user->currentAccessToken()->delete();
        return response()->json(['message' => 'Logout effettuato.']);
    }

    public function me(Request $request)
    {
        return response()->json($request->user());
    }
}
