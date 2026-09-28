<?php

namespace App\Mail;

use App\Models\WorkOrder;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WorkOrderCancelled extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public WorkOrder $order) {}

    public function envelope(): Envelope
    {
        $numero = $this->order->numero_ordine ?? $this->order->numero_tmp;
        return new Envelope(subject: "Ordine annullato - N° {$numero}");
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
