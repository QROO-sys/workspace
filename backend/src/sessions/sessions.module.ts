import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule, // ✅ makes AuthService available for JwtAuthGuard in this module context
  ],
  controllers: [SessionsController],
  providers: [SessionsService, PrismaService],
  exports: [SessionsService],
})
export class SessionsModule {}
