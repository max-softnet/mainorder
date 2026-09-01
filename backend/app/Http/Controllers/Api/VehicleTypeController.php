<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\VehicleType;
use Illuminate\Http\Request;

class VehicleTypeController extends Controller
{
    public function index()
    {
        return response()->json(VehicleType::active()->get());
    }

    public function store(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $data = $request->validate([
            'nome'   => 'required|string|max:100|unique:vehicle_types',
            'ordine' => 'integer',
            'active' => 'boolean',
        ]);

        return response()->json(VehicleType::create($data), 201);
    }

    public function update(Request $request, VehicleType $vehicleType)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $data = $request->validate([
            'nome'   => 'sometimes|string|max:100|unique:vehicle_types,nome,' . $vehicleType->id,
            'ordine' => 'integer',
            'active' => 'boolean',
        ]);

        $vehicleType->update($data);
        return response()->json($vehicleType->fresh());
    }

    public function destroy(Request $request, VehicleType $vehicleType)
    {
        if (!$request->user()->isAdmin()) abort(403);
        $vehicleType->delete();
        return response()->json(['message' => 'Tipo mezzo eliminato.']);
    }
}
