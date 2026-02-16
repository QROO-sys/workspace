import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { MenuCategoryService } from './menu-category.service';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto } from './dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('menu-categories')
@UseGuards(JwtAuthGuard)
export class MenuCategoryController {
  constructor(private readonly service: MenuCategoryService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.service.findAll(req.user.tenantId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.service.findOne(id, req.user.tenantId);
  }

  @Post()
  create(@Body() dto: CreateMenuCategoryDto, @Req() req: any) {
    return this.service.create(dto, req.user.tenantId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuCategoryDto, @Req() req: any) {
    return this.service.update(id, dto, req.user.tenantId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.service.remove(id, req.user.tenantId);
  }
}