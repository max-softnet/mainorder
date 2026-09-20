<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AccessLog;
use Illuminate\Http\Request;

class AccessLogController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $query = AccessLog::with('user')
            ->when($request->event, fn($q) => $q->where('event', $request->event))
            ->when($request->search, fn($q) => $q->where('email', 'like', "%{$request->search}%"))
            ->latest();

        return response()->json($query->paginate(50));
    }
}
