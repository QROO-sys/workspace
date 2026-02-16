import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req
} from '@nestjs/common';
import { TableService } from './table.service';
import { CreateTableDto, UpdateTableDto } from './dto';
import { OwnerGuard } from '../common/guards/owner.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// In the workspace MVP we expose these as "desks" even though the DB model is "Table"
@Controller('desks')
@UseGuards(JwtAuthGuard)
export class TableController {
  constructor(private readonly service: TableService) {}

  @Get()
  async findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(OwnerGuard)
  async create(@Body() dto: CreateTableDto, @Req() req: any) {
    return this.service.create(dto, req.user.tenantId);
  }

  // Set a single hourly rate across ALL desks (sessions) for this tenant.
  @Patch('bulk/hourly-rate')
  @UseGuards(OwnerGuard)
  async bulkHourlyRate(@Body() body: { hourlyRate: number }, @Req() req: any) {
    return this.service.bulkSetHourlyRate(req.user.tenantId, Number(body?.hourlyRate));
  }

  @Patch(':id')
  @UseGuards(OwnerGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateTableDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(OwnerGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.tenantId);
  }
}
