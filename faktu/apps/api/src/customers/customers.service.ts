import { Injectable, NotFoundException } from '@nestjs/common';
import { PgService } from '../database/pg.service';
import { CreateCustomerDto } from './dto/create-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly pg: PgService) {}

  async create(businessId: string, dto: CreateCustomerDto) {
    const { rows } = await this.pg.query(
      `INSERT INTO customers (business_id, name, phone, notes, credit_limit)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [businessId, dto.name, dto.phone ?? null, dto.notes ?? null, dto.credit_limit ?? null],
    );
    return rows[0];
  }

  async findAll(businessId: string, search?: string) {
    if (search) {
      const { rows } = await this.pg.query(
        `SELECT * FROM customers
         WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'
         ORDER BY name ASC`,
        [businessId, search],
      );
      return rows;
    }
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 ORDER BY name ASC`,
      [businessId],
    );
    return rows;
  }

  async findOne(businessId: string, id: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 AND id = $2`,
      [businessId, id],
    );
    if (!rows[0]) throw new NotFoundException('Client introuvable');
    return rows[0];
  }

  /**
   * Résolution "floue" par nom, utilisée par le module factures
   * quand l'IA fournit un nom de client sans ID (ex: "Mamadou").
   * Retourne 0, 1 ou plusieurs résultats — l'appelant décide quoi
   * faire (créer, désambiguïser, etc.) conformément à la règle
   * "ne jamais inventer".
   */
  async searchByName(businessId: string, name: string) {
    const { rows } = await this.pg.query(
      `SELECT * FROM customers WHERE business_id = $1 AND name ILIKE '%' || $2 || '%'`,
      [businessId, name],
    );
    return rows;
  }
}
