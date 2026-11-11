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

        $isSearch = $request->filled('q');

        $query = SavedStop::where('cliente_id', $request->cliente_id)
            ->when($isSearch, fn($q) => $q->where('ragione_sociale', 'like', "%{$request->q}%"))
            ->orderBy('ragione_sociale');

        if ($isSearch) $query->limit(10);

        return response()->json($query->get());
    }

    public function update(Request $request, SavedStop $savedStop)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);

        $data = $request->validate([
            'ragione_sociale' => 'required|string|max:255',
            'indirizzo'       => 'nullable|string|max:255',
            'citta'           => 'nullable|string|max:100',
            'cap'             => 'nullable|string|max:10',
            'provincia'       => 'nullable|string|max:5',
            'provincia_nome'  => 'nullable|string|max:100',
            'note'            => 'nullable|string|max:500',
        ]);

        $savedStop->update($data);

        return response()->json($savedStop->fresh());
    }

    public function destroy(Request $request, SavedStop $savedStop)
    {
        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) abort(403);

        $savedStop->delete();

        return response()->json(['deleted' => true]);
    }
}
