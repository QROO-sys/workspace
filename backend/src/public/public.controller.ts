import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  @Get('desks/:id')
  async deskWithMenu(@Param('id') id: string) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    const menuItems = await this.prisma.menuItem.findMany({
      where: { tenantId: desk.tenantId, deleted: false },
      orderBy: { name: 'asc' },
    });

    return { desk, menuItems };
  }


  @Get('desks/:id/upcoming')
  async upcomingForDesk(@Param('id') id: string) {
    const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    const now = new Date();
    const upcoming = await this.prisma.order.findMany({
      where: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        startAt: { gt: now },
      },
      orderBy: { startAt: 'asc' },
      take: 10,
      include: { orderItems: { include: { menuItem: true } } },
    });

    return { upcoming };
  }

}
