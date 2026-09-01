<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Models\WorkOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WorkOrderPdfController extends Controller
{
    public function download(Request $request, WorkOrder $workOrder)
    {
        // Solo admin e operatore
        $user = $request->user();
        if (!$user->isAdmin() && !$user->isOperatore()) abort(403);

        $order = $workOrder->load(['cliente', 'carrier', 'vehicleType', 'stops']);

        // Prima tappa carico e ultima tappa scarico
        $stopCarico  = $order->stops->where('tipo', 'carico')->sortBy('sequenza')->first();
        $stopScarico = $order->stops->where('tipo', 'scarico')->sortByDesc('sequenza')->first();

        // Settings aziendali
        $company = Setting::group('company');

        // Logo in base64
        $logoBase64 = null;
        $logoMime   = 'image/png';
        $logoPath   = Setting::get('app_logo_path');
        if ($logoPath && Storage::disk('local')->exists($logoPath)) {
            $logoBase64 = base64_encode(Storage::disk('local')->get($logoPath));
            $logoMime   = Storage::disk('local')->mimeType($logoPath) ?: 'image/png';
        }

        $pdf = Pdf::loadView('pdf.work_order', compact(
            'order', 'stopCarico', 'stopScarico', 'company', 'logoBase64', 'logoMime'
        ))->setPaper('a4', 'portrait');

        $filename = 'ordine-' . ($order->numero_ordine ?? $order->numero_tmp) . '.pdf';

        return $pdf->download($filename);
    }
}
