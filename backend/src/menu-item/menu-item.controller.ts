import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MenuItemService } from './menu-item.service';

@Controller('menu-items')
@UseGuards(JwtAuthGuard)
export class MenuItemController {
  constructor(private readonly service: MenuItemService) {}

  @Get()
  async list(@Req() req: any) {
    return this.service.listForTenant(req.user.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() body: any) {
    return this.service.createForTenant(req.user.tenantId, body);
  }

  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.service.updateForTenant(req.user.tenantId, id, body);
  }

  @Delete(':id')
  async remove(@Req() req: any, @Param('id') id: string) {
    return this.service.softDeleteForTenant(req.user.tenantId, id);
  }
}
