import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma 5+ library engine does not support the 'beforeExit' hook.
    // Use Node process events instead.
    const shutdown = async () => {
      try { await app.close(); } catch {}
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

}
