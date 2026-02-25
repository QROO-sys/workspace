import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { OrderController } from './order.controller';
import { OrdersController } from './orders.controller';
import { OrderService } from './order.service';

@Module({
  controllers: [OrderController, OrdersController],
  providers: [OrderService, PrismaService],
})
export class OrderModule {}
