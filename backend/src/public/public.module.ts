import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { PublicController } from './public.controller';

@Module({
  controllers: [PublicController],
  providers: [PrismaService],
})
export class PublicModule {}
