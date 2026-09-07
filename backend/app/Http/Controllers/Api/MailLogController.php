<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MailLog;
use Illuminate\Http\Request;

class MailLogController extends Controller
{
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $logs = MailLog::with(['workOrder:id,numero_ordine,numero_tmp', 'mittente:id,name'])
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }
}
