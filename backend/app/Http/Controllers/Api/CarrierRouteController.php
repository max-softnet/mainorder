<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CarrierRoute;
use Illuminate\Http\Request;

class CarrierRouteController extends Controller
{
    public function index(Request $request)
    {
        $query = CarrierRoute::with(['carrier', 'lastWorkOrder'])
            ->when($request->carrier_id, fn($q) => $q->where('carrier_id', $request->carrier_id))
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

    public function update(Request $request, CarrierRoute $carrierRoute)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $data = $request->validate([
            'costo'     => 'nullable|numeric|min:0',
            'km_totali' => 'nullable|numeric|min:0',
            'note'      => 'nullable|string',
        ]);

        $carrierRoute->update($data);
        return response()->json($carrierRoute->fresh(['carrier', 'lastWorkOrder']));
    }

    public function destroy(Request $request, CarrierRoute $carrierRoute)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $carrierRoute->delete();
        return response()->json(['message' => 'Tratta eliminata.']);
    }
}
