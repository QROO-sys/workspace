import { Module } from '@nestjs/common';
import { DbToolsController } from './db-tools.controller';
import { SessionsModule } from '../sessions/sessions.module';

@Module({
  imports: [SessionsModule],
  controllers: [DbToolsController],
})
export class DbToolsModule {}
