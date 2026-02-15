import { Body, Controller, Get, Patch, Post, Query, Param, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../common/guards/owner.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto';

@Controller('bookings')
@UseGuards(JwtAuthGuard)
export class BookingController {
  constructor(private service: BookingService) {}

  @Get()
  async list(
    @Req() req: any,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('tableId') tableId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.listForTenant(req.user.tenantId, { from, to, tableId, status });
  }

  // Owner/staff create future booking
  @Post()
  async create(@Req() req: any, @Body() dto: CreateBookingDto) {
    return this.service.createForTenant(req.user.tenantId, req.user.id, dto);
  }

  @Patch(':id/cancel')
  @UseGuards(OwnerGuard)
  async cancel(@Req() req: any, @Param('id') id: string) {
    return this.service.cancelForTenant(req.user.tenantId, id);
  }
}
