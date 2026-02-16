import { Module } from '@nestjs/common';
import { DbToolsController } from './db-tools.controller';

@Module({
  controllers: [DbToolsController],
})
export class DbToolsModule {}
