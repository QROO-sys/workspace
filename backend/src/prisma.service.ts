import { Injectable, OnModuleInit, INestApplication } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Prisma's event types can be narrowed to `never` unless log events are enabled.
    // This keeps shutdown hooks working without fighting Prisma's generics.
    this.$on('beforeExit' as any, async () => {
      await app.close();
    });
  }
}
