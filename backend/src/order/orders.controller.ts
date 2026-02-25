import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrderService } from './order.service';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrderService) {}

  @Get()
  async list(@Req() req: any) {
    return this.orders.list(req);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    const headerToken =
      req?.headers?.['x-agreement-token'] ||
      req?.headers?.['x-agreement'] ||
      req?.headers?.['x_laptop_agreement'];

    if (headerToken && !body?.agreementToken) {
      body.agreementToken = headerToken;
    }

    return this.orders.create(req, body);
  }
}
