import {
  Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req
} from '@nestjs/common';
import { MenuItemService } from './menu-item.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';
import { OwnerGuard } from '../common/guards/owner.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// All routes are under /menu-items
@Controller('menu-items')
@UseGuards(JwtAuthGuard)
export class MenuItemController {
  constructor(private readonly service: MenuItemService) {}

  @Get()
  async findAll(@Req() req: any) {
    // OWNER and STAFF can see all
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  @UseGuards(OwnerGuard)
  async create(@Body() dto: CreateMenuItemDto, @Req() req: any) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  @UseGuards(OwnerGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  @UseGuards(OwnerGuard)
  async remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.tenantId);
  }
}
