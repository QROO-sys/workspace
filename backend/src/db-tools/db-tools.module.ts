import { Module } from '@nestjs/common';
import { DbToolsController } from './db-tools.controller';
import { SessionsModule } from '../sessions/sessions.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,     // ✅ provides AuthService for JwtAuthGuard
    SessionsModule, // provides SessionsService used by DbToolsController
  ],
  controllers: [DbToolsController],
})
export class DbToolsModule {}
