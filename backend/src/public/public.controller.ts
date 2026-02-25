import { Body, Controller, Get, Post, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  // GET /public?deskId=...
  @Get()
  async byDesk(@Query('deskId') deskId?: string) {
    if (!deskId) throw new BadRequestException('deskId is required');

    const desk = await this.prisma.table.findFirst({
      where: { id: deskId } as any,
    } as any);

    if (!desk) throw new BadRequestException('Desk not found');

    // Menu items for the same tenant as the desk
    const tenantId = (desk as any).tenantId;
    const menuItems = await this.prisma.menuItem.findMany({
      where: {
        deleted: false as any,
        tenant: { id: tenantId },
      } as any,
      orderBy: { name: 'asc' } as any,
    } as any).catch(async () => {
      // fallback if schema uses tenantId scalar
      return this.prisma.menuItem.findMany({
        where: { deleted: false as any, tenantId } as any,
        orderBy: { name: 'asc' } as any,
      } as any);
    });

    return { ok: true, desk, menuItems };
  }

  // POST /public/orders  (guest desk-user orders, no token)
  @Post('orders')
  async createOrder(@Body() dto: any) {
    const tableId = String(dto?.tableId || '');
    if (!tableId) throw new BadRequestException('tableId is required');

    const items = Array.isArray(dto?.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException('items are required');

    const desk = await this.prisma.table.findFirst({ where: { id: tableId } as any } as any);
    if (!desk) throw new BadRequestException('Desk not found');

    const tenantId = (desk as any).tenantId;

    // Load menu items to compute pricing and enforce "Extend time requires customer info"
    const ids = items.map((x: any) => String(x?.menuItemId || '')).filter(Boolean);
    const menu = await this.prisma.menuItem.findMany({
      where: { tenant: { id: tenantId }, id: { in: ids }, deleted: false as any } as any,
    } as any).catch(async () => {
      return this.prisma.menuItem.findMany({
        where: { tenantId, id: { in: ids }, deleted: false as any } as any,
      } as any);
    });

    const byId = new Map(menu.map((m: any) => [String(m.id), m]));
    for (const it of items) {
      if (!byId.get(String(it.menuItemId))) {
        throw new BadRequestException('Invalid menuItemId in items');
      }
    }

    const hasExtraHour = menu.some((m: any) => String(m.sku || '').toUpperCase() === 'EXTRA_HOUR');

    // Only required for Extend time
    const customerName = dto?.customerName == null ? undefined : String(dto.customerName);
    const customerPhone = dto?.customerPhone == null ? undefined : String(dto.customerPhone);

    if (hasExtraHour) {
      if (!customerName?.trim() || !customerPhone?.trim()) {
        throw new BadRequestException('customerName and customerPhone are required for Extend time');
      }
    }

    // Compute total
    let total = 0;
    const orderItemsData: any[] = [];
    for (const it of items) {
      const m = byId.get(String(it.menuItemId));
      const qty = Math.max(1, Number(it.quantity || 1));
      const price = Number(m.price || 0);
      total += price * qty;
      orderItemsData.push({
        menuItemId: String(m.id),
        quantity: qty,
        price,
      });
    }

    const created = await this.prisma.order.create({
      data: {
        tableId,
        tenant: { connect: { id: tenantId } },
        customerName: hasExtraHour ? customerName?.trim() : null,
        customerPhone: hasExtraHour ? customerPhone?.trim() : null,
        notes: dto?.notes ? String(dto.notes) : null,
        paymentMethod: dto?.paymentMethod ? String(dto.paymentMethod) : 'CASH',
        paymentStatus: dto?.paymentStatus ? String(dto.paymentStatus) : 'PENDING',
        total,
        orderItems: { create: orderItemsData },
      } as any,
    } as any);

    return { ok: true, id: created.id, total };
  }
}
