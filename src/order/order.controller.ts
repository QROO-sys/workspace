import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { Role } from '@prisma/client';
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  async createOwner(@Body() dto: CreateGuestOrderDto, @Req() req: any) {
    return this.service.createOwnerOrder(req.user.tenantId, dto);
  }

  // Staff/Owner views
  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req: any) {
    // Staff can see only today's orders (prevents reconstructing all-time revenue from the orders list).
    if (req.user?.role === Role.STAFF) {
      const since = new Date();
      since.setHours(0, 0, 0, 0);
      return this.service.listForTenantSince(req.user.tenantId, since);
    }
    return this.service.listForTenant(req.user.tenantId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async get(@Param('id') id: string, @Req() req: any) {
    return this.service.getForTenant(id, req.user.tenantId);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.MANAGER, Role.STAFF)
  async updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto, @Req() req: any) {
    return this.service.updateStatus(id, req.user.tenantId, dto.status);
  }
}
