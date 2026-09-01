<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientRoute;
use Illuminate\Http\Request;

class ClientRouteController extends Controller
{
    public function index(Request $request)
    {
        $query = ClientRoute::with(['cliente', 'lastWorkOrder'])
            ->when($request->cliente_id, fn($q) => $q->where('cliente_id', $request->cliente_id))
            ->when($request->search, fn($q) => $q->where(fn($q2) => $q2
                ->where('provincia_da', 'like', "%{$request->search}%")
                ->orWhere('provincia_a', 'like', "%{$request->search}%")
            ))
            ->when($request->provincia_da, fn($q) => $q->where('provincia_da', 'like', "%{$request->provincia_da}%"))
            ->when($request->provincia_a,  fn($q) => $q->where('provincia_a',  'like', "%{$request->provincia_a}%"))
            ->orderBy('provincia_da')
            ->orderBy('provincia_a');

        return response()->json($query->paginate(50));
    }

    public function update(Request $request, ClientRoute $clientRoute)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $data = $request->validate([
            'prezzo' => 'nullable|numeric|min:0',
            'note'   => 'nullable|string',
        ]);

        $clientRoute->update($data);
        return response()->json($clientRoute->fresh(['cliente', 'lastWorkOrder']));
    }

    public function destroy(Request $request, ClientRoute $clientRoute)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $clientRoute->delete();
        return response()->json(['message' => 'Tratta eliminata.']);
    }
}
