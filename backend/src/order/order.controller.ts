import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  // Staff list
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any) {
    return this.orders.list(req);
  }

  // ✅ Staff create order (NO DTO validation here)
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.orders.create(req, body);
  }
}
