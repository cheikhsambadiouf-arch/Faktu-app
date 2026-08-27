import { Injectable } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { InvoiceNotFoundForPaymentException, PaymentExceedsBalanceException } from './payments.errors';

@Injectable()
export class PaymentsService {
  constructor(private readonly pg: PgService) {}

  /**
   * Section 34 — Transaction paiement.
   * Idempotence : si la même idempotency_key est renvoyée pour la même
   * entreprise, on renvoie le paiement existant au lieu d'en créer un
   * second (TEST DOUBLON, section 41) — grâce à la contrainte UNIQUE
   * (business_id, idempotency_key) posée en base (migration V001).
   */
  async create(businessId: string, dto: CreatePaymentDto) {
    return this.pg.withTransaction(async (client) => {
      const { rows: existing } = await client.query(
        `SELECT * FROM payments WHERE business_id = $1 AND idempotency_key = $2`,
        [businessId, dto.idempotency_key],
      );
      if (existing[0]) {
        return { payment: existing[0], duplicate: true };
      }

      const { rows: invoiceRows } = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [dto.invoice_id, businessId],
      );
      const invoice = invoiceRows[0];
      if (!invoice) throw new InvoiceNotFoundForPaymentException(dto.invoice_id);

      const balanceDue = Number(invoice.balance_due);
      if (dto.amount > balanceDue) {
        throw new PaymentExceedsBalanceException(balanceDue, dto.amount);
      }

      const { rows: paymentRows } = await client.query(
        `INSERT INTO payments (business_id, invoice_id, amount, method, reference, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [businessId, dto.invoice_id, dto.amount, dto.method, dto.reference ?? null, dto.idempotency_key],
      );

      const newAmountPaid = Number(invoice.amount_paid) + dto.amount;
      const newBalanceDue = Number(invoice.total) - newAmountPaid;
      const newStatus = newBalanceDue <= 0 ? 'PAID' : 'PARTIALLY_PAID';

      const { rows: updatedInvoiceRows } = await client.query(
        `UPDATE invoices
         SET amount_paid = $1, balance_due = $2, status = $3, updated_at = now()
         WHERE id = $4
         RETURNING *`,
        [newAmountPaid, Math.max(newBalanceDue, 0), newStatus, invoice.id],
      );

      await client.query(
        `INSERT INTO audit_logs (business_id, action, entity_type, entity_id, before, after)
         VALUES ($1, 'RECORD_PAYMENT', 'invoice', $2, $3, $4)`,
        [businessId, invoice.id, JSON.stringify(invoice), JSON.stringify(updatedInvoiceRows[0])],
      );

      return { payment: paymentRows[0], invoice: updatedInvoiceRows[0], duplicate: false };
    });
  }

  async findByInvoice(businessId: string, invoiceId: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM payments WHERE business_id = $1 AND invoice_id = $2 ORDER BY created_at ASC`,
      [businessId, invoiceId],
    );
    return rows;
  }
}
