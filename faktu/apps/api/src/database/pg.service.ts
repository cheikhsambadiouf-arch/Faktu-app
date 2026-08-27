import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Pool, PoolClient } from 'pg';

/**
 * Enveloppe fine autour du pool `pg`.
 * On évite volontairement un ORM pour le vertical slice initial :
 * moins de dépendances = plus facile à auditer et à faire fonctionner
 * rapidement. Un ORM (ex: Prisma/TypeORM) pourra être introduit plus
 * tard si la complexité le justifie.
 */
@Injectable()
export class PgService implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  query<T = any>(text: string, params?: any[]) {
    return this.pool.query<T>(text, params);
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  onModuleDestroy() {
    return this.pool.end();
  }
}
