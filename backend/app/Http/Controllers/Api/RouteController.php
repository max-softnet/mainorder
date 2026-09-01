<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Route;
use Illuminate\Http\Request;

class RouteController extends Controller
{
    // GET /api/routes?cliente_id=&carrier_id=&provincia_da=&provincia_a=
    // Usato dal frontend per cercare suggerimenti
    public function suggestion(Request $request)
    {
        $request->validate([
            'cliente_id'   => 'required|integer',
            'carrier_id'   => 'required|integer',
            'provincia_da' => 'required|string|max:5',
            'provincia_a'  => 'required|string|max:5',
        ]);

        $route = Route::findSuggestion(
            $request->cliente_id,
            $request->carrier_id,
            $request->provincia_da,
            $request->provincia_a,
        );

        if (!$route) {
            return response()->json(['found' => false]);
        }

        return response()->json([
            'found'                => true,
            'prezzo_cliente'       => $route->prezzo_cliente,
            'costo_trasportatore'  => $route->costo_trasportatore,
            'km_totali'            => $route->km_totali,
            'last_used'            => $route->updated_at?->format('d/m/Y'),
            'route_id'             => $route->id,
        ]);
    }

    // GET /api/routes — listino completo (admin/operatore)
    public function index(Request $request)
    {
        $routes = Route::with(['cliente', 'carrier'])
            ->when($request->cliente_id, fn($q) => $q->where('cliente_id', $request->cliente_id))
            ->when($request->carrier_id, fn($q) => $q->where('carrier_id', $request->carrier_id))
            ->orderBy('provincia_da')->orderBy('provincia_a')
            ->paginate(30);

        return response()->json($routes);
    }

    // PUT /api/routes/{route} — modifica manuale prezzo/costo
    public function update(Request $request, Route $route)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $data = $request->validate([
            'prezzo_cliente'      => 'nullable|numeric|min:0',
            'costo_trasportatore' => 'nullable|numeric|min:0',
            'note'                => 'nullable|string',
        ]);

        $route->update($data);
        return response()->json($route->fresh(['cliente', 'carrier']));
    }

    // DELETE /api/routes/{route}
    public function destroy(Request $request, Route $route)
    {
        if (!$request->user()->isAdmin()) {
            return response()->json(['message' => 'Non autorizzato.'], 403);
        }

        $route->delete();
        return response()->json(['message' => 'Tratta eliminata.']);
    }
}
