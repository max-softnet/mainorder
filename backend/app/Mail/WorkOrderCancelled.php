<?php

namespace App\Mail;

use App\Models\Setting;
use App\Models\WorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Address;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkOrderCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WorkOrder $order) {}

    public function envelope(): Envelope
    {
        $numero    = $this->order->numero_ordine ?? $this->order->numero_tmp;
        $fromEmail = Setting::get('mail_from_address') ?: config('mail.from.address');
        $fromName  = Setting::get('mail_from_name')    ?: config('mail.from.name');
        return new Envelope(
            from: new Address($fromEmail, $fromName),
            subject: "Ordine annullato - N° {$numero}",
        );
    }

    public function content(): Content
    {
        return new Content(view: 'mail.work_order_cancelled');
    }

    public function attachments(): array
    {
        return [];
    }
}
