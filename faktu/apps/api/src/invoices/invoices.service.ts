import { Injectable } from '@nestjs/common';
import { PoolClient } from 'pg';
import { PgService } from '../database/pg.service';
import { PreviewInvoiceDto } from './dto/preview-invoice.dto';
import { ConfirmInvoiceDto } from './dto/confirm-invoice.dto';
import {
  AmbiguousCustomerException,
  AmbiguousProductException,
  CustomerNotFoundException,
  InsufficientStockException,
  InvoiceNotPendingException,
  ProductNotFoundException,
} from './invoices.errors';

/**
 * InvoicesService implémente la boucle centrale de FAKTU (section 4) :
 *   comprendre -> vérifier -> prévisualiser -> confirmer -> exécuter
 *
 * Deux méthodes publiques :
 *   - preview() : résout client/produits, calcule les totaux,
 *                 ne touche JAMAIS au stock, crée une facture au
 *                 statut PENDING_CONFIRMATION (= la "preview" persistée).
 *   - confirm() : transforme un PENDING_CONFIRMATION en ISSUED,
 *                 dans une transaction (section 33), avec re-vérification
 *                 du stock, décrément, mouvement de stock, numérotation,
 *                 et audit.
 */
@Injectable()
export class InvoicesService {
  constructor(private readonly pg: PgService) {}

  async preview(businessId: string, dto: PreviewInvoiceDto) {
    return this.pg.withTransaction(async (client) => {
      const customer = await this.resolveCustomer(client, businessId, dto);
      const resolvedItems = await this.resolveItems(client, businessId, dto);

      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      for (const item of resolvedItems) {
        const lineGross = item.quantity * item.unit_price;
        const lineDiscount = item.discount ?? 0;
        const lineTaxable = lineGross - lineDiscount;
        const lineTax = (lineTaxable * item.tax_rate) / 100;
        subtotal += lineGross;
        discountTotal += lineDiscount;
        taxTotal += lineTax;
      }

      const total = subtotal - discountTotal + taxTotal;
      const dueDate = dto.due_in_days
        ? new Date(Date.now() + dto.due_in_days * 24 * 60 * 60 * 1000)
        : null;

      const { rows: invoiceRows } = await client.query(
        `INSERT INTO invoices
           (business_id, customer_id, number, status, subtotal, discount, tax, total, balance_due, due_date)
         VALUES ($1, $2, $3, 'PENDING_CONFIRMATION', $4, $5, $6, $7, $7, $8)
         RETURNING *`,
        [
          businessId,
          customer.id,
          `PREVIEW-${Date.now()}`, // remplacé par un vrai numéro FAC-XXXX à la confirmation
          subtotal,
          discountTotal,
          taxTotal,
          total,
          dueDate,
        ],
      );
      const invoice = invoiceRows[0];

      for (const item of resolvedItems) {
        const lineTotal =
          item.quantity * item.unit_price - (item.discount ?? 0) +
          ((item.quantity * item.unit_price - (item.discount ?? 0)) * item.tax_rate) / 100;

        await client.query(
          `INSERT INTO invoice_items
             (invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, line_total)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            invoice.id,
            item.product_id,
            item.description,
            item.quantity,
            item.unit_price,
            item.discount ?? 0,
            item.tax_rate,
            lineTotal,
          ],
        );
      }

      return {
        preview_id: invoice.id,
        requires_confirmation: true,
        customer: { id: customer.id, name: customer.name },
        items: resolvedItems.map((i) => ({
          product_id: i.product_id,
          description: i.description,
          quantity: i.quantity,
          unit_price: i.unit_price,
        })),
        subtotal,
        discount: discountTotal,
        tax: taxTotal,
        total,
        currency: 'XOF',
        due_date: dueDate,
      };
    });
  }

  async confirm(businessId: string, dto: ConfirmInvoiceDto) {
    if (!dto.confirmation) {
      // ANNULER : aucune transaction, on marque simplement la preview annulée.
      await this.pg.query(
        `UPDATE invoices SET status = 'CANCELLED', updated_at = now()
         WHERE id = $1 AND business_id = $2 AND status = 'PENDING_CONFIRMATION'`,
        [dto.preview_id, businessId],
      );
      return { status: 'CANCELLED' };
    }

    return this.pg.withTransaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM invoices WHERE id = $1 AND business_id = $2 FOR UPDATE`,
        [dto.preview_id, businessId],
      );
      const invoice = rows[0];
      if (!invoice) {
        throw new InvoiceNotPendingException('INTROUVABLE');
      }
      if (invoice.status !== 'PENDING_CONFIRMATION') {
        throw new InvoiceNotPendingException(invoice.status);
      }

      const { rows: items } = await client.query(
        `SELECT * FROM invoice_items WHERE invoice_id = $1`,
        [invoice.id],
      );

      // Re-vérification du stock au moment de la confirmation
      // (le stock a pu bouger entre la preview et la confirmation).
      for (const item of items) {
        if (!item.product_id) continue;
        const { rows: stockRows } = await client.query(
          `SELECT quantity FROM stock_balances WHERE product_id = $1 FOR UPDATE`,
          [item.product_id],
        );
        const available = Number(stockRows[0]?.quantity ?? 0);
        if (available < Number(item.quantity)) {
          const { rows: productRows } = await client.query(
            `SELECT name FROM products WHERE id = $1`,
            [item.product_id],
          );
          throw new InsufficientStockException(
            productRows[0]?.name ?? item.description,
            available,
            Number(item.quantity),
          );
        }
      }

      // Décrémenter le stock + mouvement de stock, pour chaque ligne
      for (const item of items) {
        if (!item.product_id) continue;
        await client.query(
          `UPDATE stock_balances SET quantity = quantity - $1, updated_at = now()
           WHERE product_id = $2`,
          [item.quantity, item.product_id],
        );
        await client.query(
          `INSERT INTO stock_movements (business_id, product_id, type, quantity, reference_type, reference_id)
           VALUES ($1, $2, 'SALE', $3, 'invoice', $4)`,
          [businessId, item.product_id, -Math.abs(item.quantity), invoice.id],
        );
      }

      const number = await this.nextInvoiceNumber(client, businessId);

      const { rows: updatedRows } = await client.query(
        `UPDATE invoices
         SET status = 'ISSUED', number = $1, updated_at = now()
         WHERE id = $2
         RETURNING *`,
        [number, invoice.id],
      );

      await client.query(
        `INSERT INTO audit_logs (business_id, action, entity_type, entity_id, before, after)
         VALUES ($1, 'CREATE_INVOICE', 'invoice', $2, $3, $4)`,
        [businessId, invoice.id, JSON.stringify(invoice), JSON.stringify(updatedRows[0])],
      );

      return updatedRows[0];
    });
  }

  async findAll(businessId: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM invoices WHERE business_id = $1 ORDER BY created_at DESC`,
      [businessId],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM invoices WHERE business_id = $1 AND id = $2`,
      [businessId, id],
    );
    const { rows: items } = await this.pg.query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1`,
      [id],
    );
    return { ...rows[0], items };
  }

  // ------------------------------------------------------------------
  // Résolution d'entités (section 6 — Gestion des ambiguïtés)
  // ------------------------------------------------------------------

  private async resolveCustomer(client: PoolClient, businessId: string, dto: PreviewInvoiceDto) {
    if (dto.customer_id) {
      const { rows } = await client.query(
        `SELECT * FROM customers WHERE id = $1 AND business_id = $2`,
        [dto.customer_id, businessId],
      );
      if (!rows[0]) throw new CustomerNotFoundException(dto.customer_id);
      return rows[0];
    }

    if (!dto.customer_query) {
      throw new CustomerNotFoundException('(non fourni)');
    }

    const { rows } = await client.query(
      `SELECT * FROM customers WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'`,
      [businessId, dto.customer_query],
    );

    if (rows.length === 0) throw new CustomerNotFoundException(dto.customer_query);
    if (rows.length > 1) throw new AmbiguousCustomerException(rows);
    return rows[0];
  }

  private async resolveItems(client: PoolClient, businessId: string, dto: PreviewInvoiceDto) {
    const resolved = [];

    for (const item of dto.items) {
      const { rows } = await client.query(
        `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
         FROM products p
         LEFT JOIN stock_balances sb ON sb.product_id = p.id
         WHERE p.business_id = $1 AND p.name ILIKE '%' || $2 || '%'`,
        [businessId, item.product_query],
      );

      if (rows.length === 0) throw new ProductNotFoundException(item.product_query);
      if (rows.length > 1) throw new AmbiguousProductException(item.product_query, rows);

      const product = rows[0];
      const availableStock = Number(product.stock);

      // Avertissement de stock dès la preview (section 6), sans bloquer :
      // le blocage définitif a lieu à la confirmation (re-vérification).
      if (availableStock < item.quantity) {
        throw new InsufficientStockException(product.name, availableStock, item.quantity);
      }

      resolved.push({
        product_id: product.id,
        description: product.name,
        quantity: item.quantity,
        unit_price: item.unit_price ?? Number(product.sale_price),
        discount: item.discount ?? 0,
        tax_rate: Number(product.tax_rate ?? 0),
      });
    }

    return resolved;
  }

  private async nextInvoiceNumber(client: PoolClient, businessId: string): Promise<string> {
    const year = new Date().getFullYear();
    // NB : approche simple par comptage : suffisante pour le MVP à faible
    // concurrence, mais pas garantie sans collision sous forte charge
    // concurrente. À remplacer par une séquence dédiée par business avant
    // la mise en production (limitation connue, à corriger).
    const { rows } = await client.query(
      `SELECT COUNT(*)::int AS count FROM invoices
       WHERE business_id = $1 AND status <> 'PENDING_CONFIRMATION' AND number LIKE $2`,
      [businessId, `FAC-${year}-%`],
    );
    const next = (rows[0]?.count ?? 0) + 1;
    return `FAC-${year}-${String(next).padStart(6, '0')}`;
  }
}
