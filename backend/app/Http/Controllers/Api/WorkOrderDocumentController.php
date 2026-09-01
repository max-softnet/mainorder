<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\OrderDocument;
use App\Models\WorkOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class WorkOrderDocumentController extends Controller
{
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    const MAX_FILES = 10;

    // GET /api/work-orders/{workOrder}/documents
    public function index(WorkOrder $workOrder)
    {
        return response()->json($workOrder->documents()->with('uploader')->get());
    }

    // POST /api/work-orders/{workOrder}/documents
    public function store(Request $request, WorkOrder $workOrder)
    {
        $request->validate([
            'file' => [
                'required', 'file', 'mimes:pdf',
                'max:' . (self::MAX_SIZE_BYTES / 1024), // in KB per Laravel
            ],
        ]);

        if ($workOrder->documents()->count() >= self::MAX_FILES) {
            return response()->json([
                'message' => "Limite massimo di " . self::MAX_FILES . " documenti per ordine raggiunto.",
            ], 422);
        }

        $file = $request->file('file');
        $path = $file->store("orders/{$workOrder->id}/documents", 'local');

        $doc = OrderDocument::create([
            'work_order_id'  => $workOrder->id,
            'nome_originale' => $file->getClientOriginalName(),
            'path'           => $path,
            'dimensione'     => $file->getSize(),
            'uploaded_by'    => $request->user()->id,
        ]);

        return response()->json($doc->load('uploader'), 201);
    }

    // GET /api/work-orders/{workOrder}/documents/{document}/download
    public function download(WorkOrder $workOrder, OrderDocument $document)
    {
        abort_if($document->work_order_id !== $workOrder->id, 404);

        if (!Storage::disk('local')->exists($document->path)) {
            return response()->json(['message' => 'File non trovato.'], 404);
        }

        return Storage::disk('local')->download($document->path, $document->nome_originale);
    }

    // DELETE /api/work-orders/{workOrder}/documents/{document}
    public function destroy(Request $request, WorkOrder $workOrder, OrderDocument $document)
    {
        abort_if($document->work_order_id !== $workOrder->id, 404);

        if (!$request->user()->isAdmin() && !$request->user()->isOperatore()) {
            abort(403);
        }

        Storage::disk('local')->delete($document->path);
        $document->delete();

        return response()->json(['message' => 'Documento eliminato.']);
    }
}
