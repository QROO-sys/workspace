import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto } from './dto';

@Injectable()
export class MenuCategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMenuCategoryDto, tenantId: string) {
    return this.prisma.menuCategory.create({
      data: { ...dto, tenantId }
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.menuCategory.findMany({
      where: { tenantId, deleted: false },
    });
  }

  async findOne(id: string, tenantId: string) {
    const cat = await this.prisma.menuCategory.findFirst({ where: { id, tenantId, deleted: false } });
    if (!cat) throw new NotFoundException();
    return cat;
  }

  async update(id: string, dto: UpdateMenuCategoryDto, tenantId: string) {
    const exists = await this.prisma.menuCategory.findFirst({ where: { id, tenantId, deleted: false } });
    if (!exists) throw new NotFoundException();
    return this.prisma.menuCategory.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string, tenantId: string) {
    const exists = await this.prisma.menuCategory.findFirst({ where: { id, tenantId, deleted: false } });
    if (!exists) throw new NotFoundException();
    return this.prisma.menuCategory.update({ where: { id }, data: { deleted: true } });
  }
}