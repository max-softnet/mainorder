<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SavedStop;
use Illuminate\Http\Request;

class SavedStopController extends Controller
{
    public function index(Request $request)
    {
        $request->validate([
            'cliente_id' => 'required|integer',
            'q'          => 'nullable|string|max:100',
        ]);

        $query = SavedStop::where('cliente_id', $request->cliente_id)
            ->when($request->q, fn($q) => $q->where('ragione_sociale', 'like', "%{$request->q}%"))
            ->orderBy('ragione_sociale')
            ->limit(10);

        return response()->json($query->get());
    }
}
