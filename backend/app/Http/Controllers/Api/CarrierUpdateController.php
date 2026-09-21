<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class CarrierUpdateController extends Controller
{
    public function show(string $token)
    {
        $order = WorkOrder::where('carrier_token', $token)->firstOrFail();

        if ($order->status === 'chiuso' || $order->status === 'fatturato' || $order->status === 'annullato') {
            return response()->json(['message' => 'Il link non è più valido per questo ordine.'], 410);
        }

        $logoUrl = null;
        $logoPath = Setting::get('app_logo_path');
        if ($logoPath && Storage::disk('local')->exists($logoPath)) {
            $logoUrl = url('api/carrier-update/logo');
        }

        return response()->json([
            'numero_ordine'       => $order->numero_ordine ?? $order->numero_tmp,
            'data_ordine'         => $order->data_ordine?->format('d/m/Y'),
            'data_carico'         => $order->data_carico?->format('d/m/Y'),
            'nome_autista'        => $order->nome_autista,
            'targa_motrice'       => $order->targa_motrice,
            'targa_rimorchio'     => $order->targa_rimorchio,
            'app_name'            => Setting::get('app_name') ?: 'Main Order',
            'company_name'        => Setting::get('company_name') ?: Setting::get('mail_from_name'),
            'logo_url'            => $logoUrl,
        ]);
    }

    public function update(Request $request, string $token)
    {
        $order = WorkOrder::where('carrier_token', $token)->firstOrFail();

        if ($order->status === 'chiuso' || $order->status === 'fatturato' || $order->status === 'annullato') {
            return response()->json(['message' => 'Il link non è più valido per questo ordine.'], 410);
        }

        $data = $request->validate([
            'nome_autista'    => 'nullable|string|max:255',
            'targa_motrice'   => 'nullable|string|max:20',
            'targa_rimorchio' => 'nullable|string|max:20',
        ]);

        $order->update($data);

        return response()->json(['message' => 'Dati aggiornati con successo.']);
    }

    public function logo()
    {
        $logoPath = Setting::get('app_logo_path');
        if (!$logoPath || !Storage::disk('local')->exists($logoPath)) {
            abort(404);
        }
        $content  = Storage::disk('local')->get($logoPath);
        $mime     = Storage::disk('local')->mimeType($logoPath) ?: 'image/png';
        return response($content, 200)->header('Content-Type', $mime);
    }
}
