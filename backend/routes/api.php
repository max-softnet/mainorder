<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingController;
use App\Http\Controllers\Api\CarrierContactController;
use App\Http\Controllers\Api\CarrierController;
use App\Http\Controllers\Api\ClientController;
use App\Http\Controllers\Api\RouteController;
use App\Http\Controllers\Api\ClientRouteController;
use App\Http\Controllers\Api\CarrierRouteController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\VehicleTypeController;
use App\Http\Controllers\Api\WorkOrderController;
use App\Http\Controllers\Api\WorkOrderDocumentController;
use App\Http\Controllers\Api\WorkOrderPdfController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\AccessLogController;
use App\Http\Controllers\Api\FicSyncController;
use App\Http\Controllers\Api\MailLogController;
use App\Http\Controllers\Api\StatisticsController;
use App\Http\Controllers\Api\CarrierUpdateController;
use Illuminate\Support\Facades\Route;

// Auth
Route::post('/login', [AuthController::class, 'login']);

// Aggiornamento dati mezzo da trasportatore (pubblico, con token)
Route::get('carrier-update/logo', [CarrierUpdateController::class, 'logo']);
Route::get('carrier-update/{token}', [CarrierUpdateController::class, 'show']);
Route::post('carrier-update/{token}', [CarrierUpdateController::class, 'update']);

// Config pubblica (senza auth) — nota: /config era bloccato da mod_security SiteGround
Route::get('/app-init', function () {
    return response()->json([
        'google_maps_key'  => \App\Models\Setting::get('google_maps_key', ''),
        'maps_countries'   => \App\Models\Setting::get('maps_countries', 'it,fr,ch,at,si,sm,va,es'),
    ]);
});

// Proxy OSRM e Nominatim — evita CORS browser (specialmente Safari)
Route::get('/proxy/osrm', function (\Illuminate\Http\Request $request) {
    $coords = $request->query('coords');
    if (!$coords || !preg_match('/^[\d.,;+-]+$/', $coords)) {
        return response()->json(['error' => 'invalid coords'], 400);
    }
    $url = "https://router.project-osrm.org/route/v1/driving/{$coords}?overview=false&steps=false";
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'MainOrder/1.0', CURLOPT_SSL_VERIFYPEER => true]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return response($body ?: '{}', $status)->header('Content-Type', 'application/json');
});

Route::get('/proxy/nominatim', function (\Illuminate\Http\Request $request) {
    $q = $request->query('q');
    if (!$q) return response()->json([], 200);
    $params = http_build_query(['q' => $q, 'format' => 'json', 'addressdetails' => '1', 'countrycodes' => 'it', 'limit' => '1']);
    $url = "https://nominatim.openstreetmap.org/search?{$params}";
    $ch = curl_init($url);
    curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 10,
        CURLOPT_USERAGENT => 'MainOrder/1.0', CURLOPT_SSL_VERIFYPEER => true]);
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return response($body ?: '[]', $status)->header('Content-Type', 'application/json');
});

// Rotte protette
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Fatturazione
    Route::post('billing/send', [BillingController::class, 'send']);
    Route::post('billing/test', [BillingController::class, 'testConnection']);

    // Statistiche
    Route::get('statistics', [StatisticsController::class, 'index']);

    // Ordini di lavoro
    Route::get('work-orders/prepare', [WorkOrderController::class, 'prepareData']);
    Route::patch('work-orders/{workOrder}/rif-ddt', [WorkOrderController::class, 'updateRifDdt']);
    Route::apiResource('work-orders', WorkOrderController::class);
    Route::get('work-orders/{workOrder}/pdf', [WorkOrderPdfController::class, 'download']);
    Route::post('work-orders/{workOrder}/resend-email', [WorkOrderController::class, 'resendEmail']);
    Route::get('work-orders/{workOrder}/documents', [WorkOrderDocumentController::class, 'index']);
    Route::post('work-orders/{workOrder}/documents', [WorkOrderDocumentController::class, 'store']);
    Route::get('work-orders/{workOrder}/documents/{document}/download', [WorkOrderDocumentController::class, 'download']);
    Route::delete('work-orders/{workOrder}/documents/{document}', [WorkOrderDocumentController::class, 'destroy']);

    // Clienti
    Route::apiResource('clients', ClientController::class);

    // Trasportatori + referenti annidati
    Route::apiResource('carriers', CarrierController::class);
    Route::apiResource('carriers.contacts', CarrierContactController::class)->except(['show']);

    // Tipi mezzo
    Route::apiResource('vehicle-types', VehicleTypeController::class)->except(['show']);

    // Listino tratte clienti
    Route::get('client-routes', [ClientRouteController::class, 'index']);
    Route::put('client-routes/{clientRoute}', [ClientRouteController::class, 'update']);
    Route::delete('client-routes/{clientRoute}', [ClientRouteController::class, 'destroy']);

    // Listino tratte trasportatori
    Route::get('carrier-routes', [CarrierRouteController::class, 'index']);
    Route::put('carrier-routes/{carrierRoute}', [CarrierRouteController::class, 'update']);
    Route::delete('carrier-routes/{carrierRoute}', [CarrierRouteController::class, 'destroy']);

    // Impostazioni (solo admin)
    Route::get('settings', [SettingController::class, 'index']);
    Route::put('settings', [SettingController::class, 'update']);
    Route::post('settings/smtp/test', [SettingController::class, 'testSmtp']);
    Route::get('settings/logo', [SettingController::class, 'getLogo']);
    Route::post('settings/logo', [SettingController::class, 'uploadLogo']);
    Route::delete('settings/logo', [SettingController::class, 'deleteLogo']);

    // Log email (solo admin)
    Route::get('mail-logs', [MailLogController::class, 'index']);

    // Log accessi (solo admin)
    Route::get('access-logs', [AccessLogController::class, 'index']);

    // Sync clienti Fatture in Cloud (solo admin)
    Route::get('fic/clients/preview', [FicSyncController::class, 'preview']);
    Route::post('fic/clients/import', [FicSyncController::class, 'import']);

    // Utenti (solo admin)
    Route::apiResource('users', UserController::class);
});
