import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function role(req: any) {
  return String(req?.user?.role || '').toUpperCase();
}
function tenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}
function asNonEmptyString(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s ? s : null;
}

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async list(req: any) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tId = tenantId(req);

    const orders = await this.prisma.order.findMany({
      where: tId ? ({ tenantId: tId } as any) : ({} as any),
      take: 200,
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      } as any,
      orderBy: { createdAt: 'desc' } as any,
    } as any).catch(async () => {
      // If orderBy/createdAt typing breaks, fallback without orderBy
      return this.prisma.order.findMany({
        where: tId ? ({ tenantId: tId } as any) : ({} as any),
        take: 200,
        include: {
          table: true,
          orderItems: { include: { menuItem: true } },
        } as any,
      } as any);
    });

    return { ok: true, orders };
  }

  async create(req: any, body: any) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tId = tenantId(req);

    const tableId = asNonEmptyString(body?.tableId);
    if (!tableId) throw new BadRequestException('tableId is required');

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) throw new BadRequestException('items are required');

    // Confirm desk exists and belongs to tenant
    const desk = await this.prisma.table.findFirst({
      where: tId ? ({ id: tableId, tenantId: tId } as any) : ({ id: tableId } as any),
    } as any);

    if (!desk) throw new BadRequestException('Desk not found');

    const deskTenantId = String((desk as any).tenantId || tId || '');

    // Load menu items to validate and price
    const ids = items.map((x: any) => String(x?.menuItemId || '')).filter(Boolean);
    if (!ids.length) throw new BadRequestException('items must include menuItemId');

    const menu = await this.prisma.menuItem.findMany({
      where: { tenant: { id: deskTenantId }, id: { in: ids }, deleted: false as any } as any,
    } as any).catch(async () => {
      return this.prisma.menuItem.findMany({
        where: { tenantId: deskTenantId, id: { in: ids }, deleted: false as any } as any,
      } as any);
    });

    const byId = new Map(menu.map((m: any) => [String(m.id), m]));
    for (const it of items) {
      if (!byId.get(String(it.menuItemId))) {
        throw new BadRequestException('Invalid menuItemId in items');
      }
    }

    const hasExtraHour = menu.some((m: any) => String(m.sku || '').toUpperCase() === 'EXTRA_HOUR');

    // ✅ Only required for Extend time
    const customerName = hasExtraHour ? asNonEmptyString(body?.customerName) : null;
    const customerPhone = hasExtraHour ? asNonEmptyString(body?.customerPhone) : null;

    if (hasExtraHour && (!customerName || !customerPhone)) {
      throw new BadRequestException('customerName and customerPhone are required for Extend time');
    }

    const notes = asNonEmptyString(body?.notes);
    const paymentMethod = asNonEmptyString(body?.paymentMethod) || 'CASH';
    const paymentStatus = asNonEmptyString(body?.paymentStatus) || 'PENDING';

    // Compute total and create orderItems payload
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
        tenant: { connect: { id: deskTenantId } },
        tableId,
        customerName,
        customerPhone,
        notes: notes || null,
        paymentMethod,
        paymentStatus,
        total,
        orderItems: { create: orderItemsData },
      } as any,
    } as any);

    return { ok: true, id: created.id, total };
  }
}
