import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const pool = new Pool({
  host: '127.0.0.1',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'ework_social_dev',
});

@Injectable()
export class PrismaService extends PrismaClient
  implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@127.0.0.1:5432/ework_social_dev',
        },
      },
    });
  }

  async onModuleInit() {
    try {
      // Test connection using raw pg first
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      this.logger.log('PostgreSQL raw connection successful');
      
      // Now connect Prisma
      await this.$connect();
      this.logger.log('Prisma connected successfully');
    } catch (error) {
      this.logger.error('Connection failed', error.message);
      throw error;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    await pool.end();
  }
}
