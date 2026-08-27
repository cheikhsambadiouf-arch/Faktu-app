import { Injectable, NotFoundException } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreateProductDto } from './dto/create-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly pg: PgService) {}

  async create(businessId: string, dto: CreateProductDto) {
    return this.pg.withTransaction(async (client) => {
      const { rows } = await client.query(
        `INSERT INTO products (business_id, name, sku, unit, purchase_price, sale_price, tax_rate)
         VALUES ($1, $2, $3, COALESCE($4, 'unité'), COALESCE($5, 0), $6, COALESCE($7, 0))
         RETURNING *`,
        [
          businessId,
          dto.name,
          dto.sku ?? null,
          dto.unit ?? null,
          dto.purchase_price ?? null,
          dto.sale_price,
          dto.tax_rate ?? null,
        ],
      );
      const product = rows[0];

      await client.query(
        `INSERT INTO stock_balances (product_id, quantity) VALUES ($1, $2)`,
        [product.id, dto.initial_stock ?? 0],
      );

      if (dto.initial_stock && dto.initial_stock > 0) {
        await client.query(
          `INSERT INTO stock_movements (business_id, product_id, type, quantity, reference_type)
           VALUES ($1, $2, 'ADJUSTMENT', $3, 'initial_stock')`,
          [businessId, product.id, dto.initial_stock],
        );
      }

      return { ...product, stock: dto.initial_stock ?? 0 };
    });
  }

  async findAll(businessId: string, search?: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1
         AND ($2::text IS NULL OR p.name ILIKE '%' || $2 || '%')
       ORDER BY p.name ASC`,
      [businessId, search ?? null],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1 AND p.id = $2`,
      [businessId, id],
    );
    if (!rows[0]) throw new NotFoundException('Produit introuvable');
    return rows[0];
  }

  async searchByName(businessId: string, name: string) {
    const { rows } = await this.pg.query(
      `SELECT p.*, COALESCE(sb.quantity, 0) AS stock
       FROM products p
       LEFT JOIN stock_balances sb ON sb.product_id = p.id
       WHERE p.business_id = $1 AND p.name ILIKE '%' || $2 || '%'`,
      [businessId, name],
    );
    return rows;
  }
}
