import { Body, Controller, Get, Param, Post, Query, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Controller('public')
export class PublicController {
  constructor(private prisma: PrismaService) {}

  private p() {
    return this.prisma as any;
  }

  private async findDeskOrTable(id: string) {
    const p = this.p();
    // your current schema uses table for desks
    if (p.table) {
      const table = await p.table.findFirst({ where: { id } });
      return { kind: 'table' as const, record: table };
    }
    if (p.desk) {
      const desk = await p.desk.findFirst({ where: { id } });
      return { kind: 'desk' as const, record: desk };
    }
    throw new BadRequestException('Server misconfigured: no table/desk model');
  }

  private async loadMenuItemsForTenant(tenantId: string) {
    const p = this.p();

    // prefer scalar tenantId if it exists; fallback to tenant relation
    const items = await p.menuItem
      .findMany({
        where: { tenantId, deleted: false },
        orderBy: { name: 'asc' },
      })
      .catch(async () => {
        return p.menuItem.findMany({
          where: { deleted: false, tenant: { id: tenantId } },
          orderBy: { name: 'asc' },
        });
      });

    return items as any[];
  }

  private priceFromMenuItem(m: any): number {
    const v =
      m?.price ??
      m?.priceEgp ??
      m?.priceEGP ??
      m?.unitPrice ??
      m?.unitPriceEgp ??
      m?.unitPriceEGP ??
      0;

    const n = Number(v);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  // GET /public?deskId=...
  @Get()
  async byDesk(@Query('deskId') deskId?: string) {
    if (!deskId) throw new BadRequestException('deskId is required');

    const { record } = await this.findDeskOrTable(String(deskId));
    if (!record) throw new BadRequestException('Desk not found');

    const tenantId = String((record as any).tenantId || '');
    if (!tenantId) throw new BadRequestException('Desk missing tenantId');

    const menuItems = await this.loadMenuItemsForTenant(tenantId);

    // Keep response shape friendly to frontend
    return { ok: true, desk: record, menuItems };
  }

  // GET /public/orders/:orderId   (used by /checkout?orderId=...)
  @Get('orders/:orderId')
  async getOrder(@Param('orderId') orderId: string) {
    const p = this.p();
    const id = String(orderId || '').trim();
    if (!id) throw new BadRequestException('orderId is required');

    // include orderItems and menuItem if possible
    const order = await p.order.findFirst({
      where: { id },
      include: {
        orderItems: { include: { menuItem: true } },
        table: true,
        desk: true,
      },
    }).catch(async () => {
      // fallback if relations differ
      return p.order.findFirst({
        where: { id },
        include: { orderItems: true },
      });
    });

    if (!order) throw new BadRequestException('Order not found');

    return { ok: true, order };
  }

  // POST /public/orders  (guest desk-user orders)
  @Post('orders')
  async createOrder(@Body() dto: any) {
    const p = this.p();

    const tableId = String(dto?.tableId || dto?.deskId || '');
    if (!tableId) throw new BadRequestException('tableId (or deskId) is required');

    const items = Array.isArray(dto?.items) ? dto.items : [];
    if (!items.length) throw new BadRequestException('items are required');

    const { record } = await this.findDeskOrTable(tableId);
    if (!record) throw new BadRequestException('Desk not found');

    const tenantId = String((record as any).tenantId || '');
    if (!tenantId) throw new BadRequestException('Desk missing tenantId');

    // Load menu items for pricing
    const ids = items.map((x: any) => String(x?.menuItemId || '')).filter(Boolean);
    if (!ids.length) throw new BadRequestException('menuItemId is required in items');

    const menu = await p.menuItem
      .findMany({ where: { tenantId, id: { in: ids }, deleted: false } })
      .catch(async () => {
        return p.menuItem.findMany({ where: { tenant: { id: tenantId }, id: { in: ids }, deleted: false } });
      });

    const byId = new Map((menu || []).map((m: any) => [String(m.id), m]));
    for (const it of items) {
      if (!byId.get(String(it.menuItemId))) throw new BadRequestException('Invalid menuItemId in items');
    }

    const hasExtraHour = (menu || []).some((m: any) => String(m.sku || '').toUpperCase() === 'EXTRA_HOUR');

    const customerName = dto?.customerName == null ? undefined : String(dto.customerName);
    const customerPhone = dto?.customerPhone == null ? undefined : String(dto.customerPhone);

    if (hasExtraHour) {
      if (!customerName?.trim() || !customerPhone?.trim()) {
        throw new BadRequestException('customerName and customerPhone are required for Extend time');
      }
    }

    // Compute total + orderItems
    let total = 0;
    const orderItemsData: any[] = [];
    for (const it of items) {
      const m = byId.get(String(it.menuItemId));
      const quantity = Math.max(1, Math.floor(Number(it.quantity ?? it.qty ?? 1)));
      const price = this.priceFromMenuItem(m);
      total += price * quantity;
      orderItemsData.push({
        menuItemId: String(m.id),
        quantity,
        price,
      });
    }

    // Create order (schema-tolerant tenant linkage)
    const created = await p.order
      .create({
        data: {
          tableId, // ok even if your model calls it tableId
          tenantId,
          customerName: hasExtraHour ? customerName!.trim() : null,
          customerPhone: hasExtraHour ? customerPhone!.trim() : null,
          total,
          orderItems: { create: orderItemsData },
        },
        include: { orderItems: true },
      })
      .catch(async () => {
        // fallback: tenant is a relation
        return p.order.create({
          data: {
            tableId,
            tenant: { connect: { id: tenantId } },
            customerName: hasExtraHour ? customerName!.trim() : null,
            customerPhone: hasExtraHour ? customerPhone!.trim() : null,
            total,
            orderItems: { create: orderItemsData },
          },
          include: { orderItems: true },
        });
      });

    return { ok: true, order: created };
  }

  /**
   * POST /public/orders/service
   * Body: { tenantId, serviceSku, quantity }
   * Creates a deskless counter order by SKU (e.g. PRINT).
   */
  @Post('orders/service')
  async createServiceOrder(@Body() dto: any) {
    const p = this.p();

    const tenantId = String(dto?.tenantId || '').trim();
    const serviceSku = String(dto?.serviceSku || '').trim().toUpperCase();
    const quantity = Math.max(1, Math.floor(Number(dto?.quantity || 1)));

    if (!tenantId) throw new BadRequestException('tenantId is required');
    if (!serviceSku) throw new BadRequestException('serviceSku is required');

    const menuItem = await p.menuItem
      .findFirst({ where: { tenantId, sku: serviceSku, deleted: false } })
      .catch(async () => {
        return p.menuItem.findFirst({ where: { tenant: { id: tenantId }, sku: serviceSku, deleted: false } });
      });

    if (!menuItem) throw new BadRequestException(`Service SKU not found for tenant: ${serviceSku}`);

    const price = this.priceFromMenuItem(menuItem);
    if (!Number.isFinite(price) || price <= 0) throw new BadRequestException('Service item has invalid price');

    const total = price * quantity;

    const created = await p.order
      .create({
        data: {
          tenantId,
          total,
          customerName: null,
          customerPhone: null,
          orderItems: {
            create: [
              {
                menuItemId: String(menuItem.id),
                quantity,
                price,
              },
            ],
          },
        },
        include: { orderItems: { include: { menuItem: true } } },
      })
      .catch(async () => {
        return p.order.create({
          data: {
            tenant: { connect: { id: tenantId } },
            total,
            customerName: null,
            customerPhone: null,
            orderItems: {
              create: [
                {
                  menuItemId: String(menuItem.id),
                  quantity,
                  price,
                },
              ],
            },
          },
          include: { orderItems: { include: { menuItem: true } } },
        });
      });

    return { ok: true, order: created };
  }
}
