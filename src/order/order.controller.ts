import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../common/guards/owner.guard';
import { OrderService } from './order.service';
import { CreateGuestOrderDto, UpdateOrderStatusDto } from './dto';

@Controller('orders')
export class OrderController {
  constructor(private service: OrderService) {}

  // Guest check-in/order (no auth). Desk QR sends the tableId in the URL.
  @Post('guest')
  async createGuest(@Body() dto: CreateGuestOrderDto) {
    return this.service.createGuestOrder(dto);
  }


  // Upcoming bookings (future time slots)
  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  async upcoming(@Req() req: any) {
    return this.service.upcomingForTenant(req.user.tenantId);
  }

  // Owner can create bookings / walk-in sessions
  @Post()
  @UseGuards(JwtAuthGuard, OwnerGuard)
  async createOwner(@Body() dto: CreateGuestOrderDto, @Req() req: any) {
    return this.service.createOwnerOrder(req.user.tenantId, dto);
  }

  // Staff/Owner views
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    return this.service.listForTenant(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Param('id') id: string, @Req() req: any) {
    return this.service.getForTenant(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Req() req: any) {
    return this.service.updateStatus(id, req.user.tenantId, dto.status);
  }
}
