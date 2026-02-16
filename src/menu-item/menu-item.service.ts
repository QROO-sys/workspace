import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMenuItemDto, UpdateMenuItemDto } from './dto';

@Injectable()
export class MenuItemService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMenuItemDto, tenantId: string) {
    return this.prisma.menuItem.create({
      data: { ...dto, tenantId }
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.menuItem.findMany({
      where: { tenantId, deleted: false },
    });
  }

  async findOne(id: string, tenantId: string) {
    const item = await this.prisma.menuItem.findFirst({
      where: { id, tenantId, deleted: false }
    });
    if (!item) throw new NotFoundException('MenuItem not found');
    return item;
  }

  async update(id: string, dto: UpdateMenuItemDto, tenantId: string) {
    const check = await this.prisma.menuItem.findFirst({ where: { id, tenantId, deleted: false } });
    if (!check) throw new NotFoundException('MenuItem not found');
    return this.prisma.menuItem.update({
      where: { id },
      data: { ...dto }
    });
  }

  async remove(id: string, tenantId: string) {
    const check = await this.prisma.menuItem.findFirst({ where: { id, tenantId, deleted: false } });
    if (!check) throw new NotFoundException('MenuItem not found');
    return this.prisma.menuItem.update({
      where: { id },
      data: { deleted: true }
    });
  }
}