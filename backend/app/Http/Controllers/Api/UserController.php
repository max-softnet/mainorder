<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $users = User::query()
            ->when($request->role, fn($q) => $q->where('role', $request->role))
            ->when($request->search, fn($q) => $q->where('name', 'like', "%{$request->search}%")
                ->orWhere('email', 'like', "%{$request->search}%"))
            ->orderBy('name')
            ->paginate(20);

        return response()->json($users);
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users',
            'password' => 'required|min:8',
            'role' => 'required|in:admin,operatore,cliente,trasportatore',
            'phone' => 'nullable|string',
            'company' => 'nullable|string',
            'active' => 'boolean',
        ]);

        $data['password'] = Hash::make($data['password']);
        $user = User::create($data);

        return response()->json($user, 201);
    }

    public function show(Request $request, User $user)
    {
        $auth = $request->user();
        if (!$auth->isAdmin() && $auth->id !== $user->id) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        return response()->json($user);
    }

    public function update(Request $request, User $user)
    {
        $auth = $request->user();
        if (!$auth->isAdmin() && $auth->id !== $user->id) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'password' => 'sometimes|min:8',
            'role' => 'sometimes|in:admin,operatore,cliente,trasportatore',
            'phone' => 'nullable|string',
            'company' => 'nullable|string',
            'active' => 'sometimes|boolean',
        ]);

        if (!$auth->isAdmin()) {
            unset($data['role'], $data['active']);
        }

        if (isset($data['password'])) {
            $data['password'] = Hash::make($data['password']);
        }

        $user->update($data);
        return response()->json($user->fresh());
    }

    public function destroy(Request $request, User $user)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $user->delete();
        return response()->json(['message' => 'Utente eliminato.']);
    }
}
