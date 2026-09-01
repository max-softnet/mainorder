<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class SettingController extends Controller
{
    // GET /api/settings — tutti i settings (solo admin)
    public function index(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $settings = Setting::orderBy('group')->orderBy('key')->get()
            ->map(fn($s) => [
                'key'         => $s->key,
                'group'       => $s->group,
                'label'       => $s->label,
                'description' => $s->description,
                'type'        => $s->type,
                // Non esporre mai le password in chiaro
                'value'       => $s->type === 'password' ? (filled($s->value) ? '••••••••' : '') : $s->value,
            ]);

        return response()->json($settings->groupBy('group'));
    }

    // PUT /api/settings — aggiorna uno o più valori
    public function update(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $data = $request->validate([
            'settings'       => 'required|array',
            'settings.*.key' => 'required|string|exists:settings,key',
            'settings.*.value' => 'nullable|string',
        ]);

        foreach ($data['settings'] as $item) {
            // Non sovrascrivere la password se arriva il placeholder
            if ($item['value'] === '••••••••') continue;
            Setting::set($item['key'], $item['value']);
        }

        return response()->json(['message' => 'Impostazioni salvate.']);
    }

    // POST /api/settings/logo — carica il logo aziendale
    public function uploadLogo(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $request->validate([
            'logo' => 'required|file|mimes:png,jpg,jpeg,svg|max:2048',
        ]);

        // Elimina il vecchio logo se presente
        $oldPath = Setting::get('app_logo_path');
        if ($oldPath && Storage::disk('local')->exists($oldPath)) {
            Storage::disk('local')->delete($oldPath);
        }

        $file = $request->file('logo');
        $ext  = $file->getClientOriginalExtension();
        $path = $file->storeAs('logo', 'logo.' . $ext, 'local');

        Setting::set('app_logo_path', $path);

        return response()->json(['message' => 'Logo caricato.', 'path' => $path]);
    }

    // GET /api/settings/logo — restituisce l'immagine del logo (per anteprima frontend)
    public function getLogo(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $path = Setting::get('app_logo_path');
        if (!$path || !Storage::disk('local')->exists($path)) {
            return response()->json(['logo' => null]);
        }

        $base64 = base64_encode(Storage::disk('local')->get($path));
        $mime   = Storage::disk('local')->mimeType($path) ?: 'image/png';

        return response()->json(['logo' => 'data:' . $mime . ';base64,' . $base64]);
    }

    // DELETE /api/settings/logo — rimuove il logo
    public function deleteLogo(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $path = Setting::get('app_logo_path');
        if ($path && Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
        Setting::set('app_logo_path', '');

        return response()->json(['message' => 'Logo rimosso.']);
    }

    // POST /api/settings/smtp/test — invia una mail di test
    public function testSmtp(Request $request)
    {
        if (!$request->user()->isAdmin()) abort(403);

        $request->validate(['email' => 'required|email']);

        Setting::applySmtp();

        try {
            Mail::raw('Test connessione SMTP da MainOrder — tutto funziona correttamente.', function ($msg) use ($request) {
                $msg->to($request->email)->subject('Test SMTP — MainOrder');
            });
            return response()->json(['message' => 'Mail di test inviata a ' . $request->email]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Errore SMTP: ' . $e->getMessage()], 422);
        }
    }
}
