<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\WorkOrder;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Attachment;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class WorkOrderConfirmed extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WorkOrder $order) {}

    public function envelope(): Envelope
    {
        $numero = $this->order->numero_ordine ?? $this->order->numero_tmp;
        return new Envelope(subject: "Conferma ordine {$numero} — MainOrder");
    }

    public function content(): Content
    {
        return new Content(view: 'mail.work_order_confirmed');
    }

    public function attachments(): array
    {
        $order = $this->order->load(['cliente', 'carrier', 'vehicleType', 'stops']);

        $stopCarico  = $order->stops->where('tipo', 'carico')->sortBy('sequenza')->first();
        $stopScarico = $order->stops->where('tipo', 'scarico')->sortByDesc('sequenza')->first();
        $company     = Setting::group('company');

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

        return [
            Attachment::fromData(fn() => $pdf->output(), $filename)
                ->withMime('application/pdf'),
        ];
    }
}
