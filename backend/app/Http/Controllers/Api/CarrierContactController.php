<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Carrier;
use App\Models\CarrierContact;
use Illuminate\Http\Request;

class CarrierContactController extends Controller
{
    // GET /api/carriers/{carrier}/contacts
    public function index(Carrier $carrier)
    {
        return response()->json($carrier->contacts);
    }

    // POST /api/carriers/{carrier}/contacts
    public function store(Request $request, Carrier $carrier)
    {
        $this->authorizeAdminOrOperatore($request);

        $data = $request->validate([
            'cognome'  => 'required|string|max:100',
            'nome'     => 'required|string|max:100',
            'email'    => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:30',
            'ruolo'    => 'nullable|string|max:100',
            'note'     => 'nullable|string',
        ]);

        $contact = $carrier->contacts()->create($data);
        return response()->json($contact, 201);
    }

    // PUT /api/carriers/{carrier}/contacts/{contact}
    public function update(Request $request, Carrier $carrier, CarrierContact $contact)
    {
        $this->authorizeAdminOrOperatore($request);

        abort_if($contact->carrier_id !== $carrier->id, 404);

        $data = $request->validate([
            'cognome'  => 'required|string|max:100',
            'nome'     => 'required|string|max:100',
            'email'    => 'nullable|email|max:255',
            'telefono' => 'nullable|string|max:30',
            'ruolo'    => 'nullable|string|max:100',
            'note'     => 'nullable|string',
        ]);

        $contact->update($data);
        return response()->json($contact->fresh());
    }

    // DELETE /api/carriers/{carrier}/contacts/{contact}
    public function destroy(Request $request, Carrier $carrier, CarrierContact $contact)
    {
        $this->authorizeAdminOrOperatore($request);

        abort_if($contact->carrier_id !== $carrier->id, 404);

        // Regola: almeno 1 referente deve rimanere
        if ($carrier->contacts()->count() <= 1) {
            return response()->json([
                'message' => 'Impossibile eliminare: il trasportatore deve avere almeno un referente.',
            ], 422);
        }

        $contact->delete();
        return response()->json(['message' => 'Referente eliminato.']);
    }

    private function authorizeAdminOrOperatore(Request $request): void
    {
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) {
            abort(403, 'Non autorizzato.');
        }
    }
}
