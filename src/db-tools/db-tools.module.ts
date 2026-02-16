import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DbToolsController } from './db-tools.controller';

@Module({
  imports: [AuthModule],
  controllers: [DbToolsController],
})
export class DbToolsModule {}
