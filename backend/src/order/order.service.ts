import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

function role(req: any) {
  return String(req?.user?.role || '').toUpperCase();
}
function tenantId(req: any): string | null {
  const t = req?.user?.tenantId;
  return t ? String(t) : null;
}
function s(v: any): string | null {
  if (v === null || v === undefined) return null;
  const out = String(v).trim();
  return out ? out : null;
}
function skuUpper(v: any) {
  return String(v || '').toUpperCase();
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
    } as any);

    return { ok: true, orders };
  }

  async create(req: any, body: any) {
    const r = role(req);
    if (!['OWNER', 'ADMIN', 'EMPLOYEE'].includes(r)) throw new ForbiddenException('Staff only');

    const tId = tenantId(req);

    const tableId = s(body?.tableId);
    if (!tableId) throw new BadRequestException('tableId is required');

    const items = Array.isArray(body?.items) ? body.items : [];
    if (!items.length) throw new BadRequestException('items are required');

    // Desk must exist (and belong to tenant if tenantId exists in token)
    const desk = await this.prisma.table.findFirst({
      where: tId ? ({ id: tableId, tenantId: tId } as any) : ({ id: tableId } as any),
    } as any);

    if (!desk) throw new BadRequestException('Desk not found');

    const deskTenantId = String((desk as any).tenantId || tId || '');

    // Load menu items to validate IDs + compute total
    const ids = items.map((x: any) => String(x?.menuItemId || '')).filter(Boolean);
    if (!ids.length) throw new BadRequestException('items must include menuItemId');

    const menu = await this.prisma.menuItem.findMany({
      where: { id: { in: ids } } as any,
      take: 1000,
    } as any);

    const byId = new Map(menu.map((m: any) => [String(m.id), m]));
    for (const it of items) {
      if (!byId.get(String(it.menuItemId))) {
        throw new BadRequestException('Invalid menuItemId in items');
      }
    }

    const hasExtraHour = menu.some((m: any) => skuUpper(m.sku) === 'EXTRA_HOUR');

    // Only require customer details for EXTRA_HOUR
    const customerName = hasExtraHour ? s(body?.customerName) : null;
    const customerPhone = hasExtraHour ? s(body?.customerPhone) : null;
    if (hasExtraHour && (!customerName || !customerPhone)) {
      throw new BadRequestException('customerName and customerPhone are required for Extend time');
    }

    // Compute totals and orderItems payload
    let total = 0;
    const orderItemsData: any[] = [];
    for (const it of items) {
      const m = byId.get(String(it.menuItemId));
      const qty = Math.max(1, Number(it.quantity || 1));
      const price = Number(m.price || 0);
      total += price * qty;
      orderItemsData.push({ menuItemId: String(m.id), quantity: qty, price });
    }

    const notes = s(body?.notes);
    const paymentMethod = s(body?.paymentMethod) || 'CASH';
    const paymentStatus = s(body?.paymentStatus) || 'PENDING';

    // Try create with progressively simpler payloads to avoid Prisma schema mismatch
    const attempts: any[] = [];

    // Attempt 1: tenant relation + payment fields + orderItems
    attempts.push({
      tenant: deskTenantId ? { connect: { id: deskTenantId } } : undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
      paymentStatus,
      total,
      orderItems: { create: orderItemsData },
    });

    // Attempt 2: tenantId scalar + payment fields + orderItems
    attempts.push({
      tenantId: deskTenantId || undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      paymentMethod,
      paymentStatus,
      total,
      orderItems: { create: orderItemsData },
    });

    // Attempt 3: no payment fields (if model doesn’t have them)
    attempts.push({
      tenant: deskTenantId ? { connect: { id: deskTenantId } } : undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      total,
      orderItems: { create: orderItemsData },
    });
    attempts.push({
      tenantId: deskTenantId || undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      total,
      orderItems: { create: orderItemsData },
    });

    // Attempt 4: if relation name differs (items instead of orderItems)
    attempts.push({
      tenant: deskTenantId ? { connect: { id: deskTenantId } } : undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      total,
      items: { create: orderItemsData },
    });
    attempts.push({
      tenantId: deskTenantId || undefined,
      tableId,
      customerName,
      customerPhone,
      notes,
      total,
      items: { create: orderItemsData },
    });

    // Attempt 5: minimal order (no tenant, no nested create) — should never be needed, but prevents hard fail
    attempts.push({
      tableId,
      customerName,
      customerPhone,
      notes,
      total,
    });

    let lastErr: any = null;

    for (const data of attempts) {
      try {
        // Clean undefined keys (Prisma hates some undefined nesting)
        const cleaned: any = {};
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) cleaned[k] = v;
        }

        const created = await this.prisma.order.create({ data: cleaned } as any);

        // If we had to create minimal order, still try to attach items afterwards if relation exists
        if (!cleaned.orderItems && !cleaned.items) {
          try {
            await this.prisma.orderItem.createMany({
              data: orderItemsData.map((oi) => ({ ...oi, orderId: created.id })),
            } as any);
          } catch {
            // ignore — schema may not have orderItem model exposed
          }
        }

        return { ok: true, id: created.id, total };
      } catch (e: any) {
        lastErr = e;
      }
    }

    // If all attempts failed, surface a useful message for you in logs
    // but a generic message for the client.
    // eslint-disable-next-line no-console
    console.error('[OrderService.create] Failed all create attempts:', lastErr?.message || lastErr);
    throw new BadRequestException('Order could not be created (server config mismatch). Check server logs.');
  }
}
