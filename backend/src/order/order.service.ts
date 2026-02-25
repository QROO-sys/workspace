import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

const EXTRA_HOUR_SKU = 'EXTRA_HOUR';

type CreateOrderDtoLike = {
  deskId?: string;
  tableId?: string;

  items?: Array<{
    itemId?: string;
    menuItemId?: string;
    qty?: number;
    quantity?: number;
  }>;

  customerName?: string;
  customerPhone?: string;
  notes?: string;

  // optional query params used by controller list(req)
  since?: string;
};

type NormalizedItem = { menuItemId: string; qty: number };

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  private prismaAny() {
    return this.prisma as any;
  }

  // -----------------------------
  // Controller compatibility layer
  // -----------------------------
  // Your controller calls: orders.list(req)
  async list(req: any) {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId missing');

    const since = req?.query?.since;
    if (since) return this.listForTenantSince(tenantId, since);
    return this.listForTenant(tenantId);
  }

  // Your controller calls: orders.create(req, body)
  async create(req: any, body: any) {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId missing');
    return this.createOwnerOrder(tenantId, body);
  }

  // --------- Helpers ---------
  private getResourceModelName(): 'table' | 'desk' {
    const p = this.prismaAny();
    if (p.table) return 'table';
    if (p.desk) return 'desk';
    throw new BadRequestException('Neither Prisma model "table" nor "desk" exists. Check schema + prisma generate.');
  }

  private getResourceId(dto: CreateOrderDtoLike): string {
    const id = dto.deskId || dto.tableId;
    if (!id) throw new BadRequestException('deskId (or tableId) is required');
    return id;
  }

  private normalizeItems(dto: CreateOrderDtoLike): NormalizedItem[] {
    const raw = Array.isArray(dto.items) ? dto.items : [];

    const items: NormalizedItem[] = raw
      .map((i) => {
        const menuItemId = (i.itemId || i.menuItemId || '').trim();
        const qtyRaw =
          Number.isFinite(i.qty as any) ? (i.qty as any) : Number.isFinite(i.quantity as any) ? (i.quantity as any) : 0;
        const qty = Math.max(0, Math.floor(qtyRaw));
        return { menuItemId, qty };
      })
      .filter((i) => i.menuItemId.length > 0 && i.qty > 0);

    if (items.length === 0) throw new BadRequestException('No items');
    return items;
  }

  private resolvePriceEgp(menuItem: any): number {
    const candidates = [
      menuItem.priceEgp,
      menuItem.priceEGP,
      menuItem.price,
      menuItem.unitPriceEgp,
      menuItem.unitPriceEGP,
      menuItem.unitPrice,
      menuItem.amountEgp,
      menuItem.amountEGP,
    ].filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (candidates.length === 0) {
      throw new BadRequestException(`Menu item "${menuItem?.id}" has no numeric price field`);
    }
    return candidates[0];
  }

  private mustRequireCustomerInfo(menuItems: any[]): boolean {
    return menuItems.some((mi) => (mi?.sku || '').toUpperCase() === EXTRA_HOUR_SKU);
  }

  private validateCustomerInfoIfNeeded(require: boolean, dto: CreateOrderDtoLike) {
    if (!require) return;
    if (typeof dto.customerName !== 'string' || dto.customerName.trim().length < 2) {
      throw new BadRequestException('customerName is required for EXTRA_HOUR');
    }
    if (typeof dto.customerPhone !== 'string' || dto.customerPhone.trim().length < 6) {
      throw new BadRequestException('customerPhone is required for EXTRA_HOUR');
    }
  }

  private async loadResourceAndTenant(resourceId: string) {
    const p = this.prismaAny();
    const model = this.getResourceModelName();

    const resource = await p[model].findFirst({
      where: { id: resourceId },
    });

    if (!resource) throw new NotFoundException('Desk not found');
    if (!resource.tenantId) throw new BadRequestException(`${model} has no tenantId`);
    return { resource, tenantId: resource.tenantId as string, model };
  }

  private async loadMenuItems(tenantId: string, menuItemIds: string[]) {
    const p = this.prismaAny();
    const menuItems = await p.menuItem.findMany({
      where: { id: { in: menuItemIds }, tenantId },
    });

    if (!menuItems || menuItems.length !== menuItemIds.length) {
      throw new BadRequestException('Invalid menu item(s) for this tenant');
    }
    return menuItems as any[];
  }

  private buildOrderItems(menuItems: any[], items: NormalizedItem[]) {
    const byId = new Map(menuItems.map((mi) => [mi.id, mi]));
    const orderItems = items.map((i) => {
      const mi = byId.get(i.menuItemId);
      if (!mi) throw new BadRequestException('Invalid item');
      const unitPriceEgp = this.resolvePriceEgp(mi);
      return {
        menuItemId: mi.id,
        qty: i.qty,
        unitPriceEgp,
        lineTotalEgp: unitPriceEgp * i.qty,
      };
    });
    const totalEgp = orderItems.reduce((s, li) => s + li.lineTotalEgp, 0);
    return { orderItems, totalEgp };
  }

  // --------- API used elsewhere ----------
  async listForTenant(tenantId: string) {
    const p = this.prismaAny();
    return p.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true },
      take: 200,
    });
  }

  async listForTenantSince(tenantId: string, since: any) {
    const p = this.prismaAny();
    const d = since instanceof Date ? since : new Date(since);
    if (Number.isNaN(d.getTime())) throw new BadRequestException('Invalid since date');
    return p.order.findMany({
      where: { tenantId, createdAt: { gte: d } },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true },
    });
  }

  async getForTenant(id: string, tenantId: string) {
    const p = this.prismaAny();
    const order = await p.order.findFirst({
      where: { id, tenantId },
      include: { orderItems: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async upcomingForTenant(tenantId: string) {
    const p = this.prismaAny();
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return p.order.findMany({
      where: { tenantId, createdAt: { gte: start } },
      orderBy: { createdAt: 'desc' },
      include: { orderItems: true },
      take: 50,
    });
  }

  async createGuestOrder(dto: CreateOrderDtoLike) {
    const p = this.prismaAny();

    const resourceId = this.getResourceId(dto);
    const { resource, tenantId, model } = await this.loadResourceAndTenant(resourceId);

    const items = this.normalizeItems(dto);
    const menuItemIds = items.map((i) => i.menuItemId);

    const menuItems = await this.loadMenuItems(tenantId, menuItemIds);
    const requireCustomer = this.mustRequireCustomerInfo(menuItems);
    this.validateCustomerInfoIfNeeded(requireCustomer, dto);

    const { orderItems, totalEgp } = this.buildOrderItems(menuItems, items);

    try {
      const order = await p.order.create({
        data: {
          tenantId,
          ...(model === 'table' ? { tableId: resource.id } : { deskId: resource.id }),

          totalEgp,
          customerName: requireCustomer ? dto.customerName!.trim() : null,
          customerPhone: requireCustomer ? dto.customerPhone!.trim() : null,
          notes: typeof dto.notes === 'string' && dto.notes.trim() ? dto.notes.trim() : null,

          orderItems: {
            create: orderItems.map((li) => ({
              menuItemId: li.menuItemId,
              qty: li.qty,
              unitPriceEgp: li.unitPriceEgp,
              lineTotalEgp: li.lineTotalEgp,
            })),
          },
        },
        include: { orderItems: true },
      });

      return { ok: true, order };
    } catch (e: any) {
      throw new BadRequestException(`Order create failed: ${e?.message || e}`);
    }
  }

  async createOwnerOrder(tenantId: string, dto: CreateOrderDtoLike) {
    const p = this.prismaAny();

    const resourceId = this.getResourceId(dto);
    const { resource, tenantId: resourceTenantId, model } = await this.loadResourceAndTenant(resourceId);
    if (resourceTenantId !== tenantId) throw new BadRequestException('Desk tenant mismatch');

    const items = this.normalizeItems(dto);
    const menuItemIds = items.map((i) => i.menuItemId);

    const menuItems = await this.loadMenuItems(tenantId, menuItemIds);
    const requireCustomer = this.mustRequireCustomerInfo(menuItems);
    this.validateCustomerInfoIfNeeded(requireCustomer, dto);

    const { orderItems, totalEgp } = this.buildOrderItems(menuItems, items);

    try {
      const order = await p.order.create({
        data: {
          tenantId,
          ...(model === 'table' ? { tableId: resource.id } : { deskId: resource.id }),

          totalEgp,
          customerName: requireCustomer ? dto.customerName!.trim() : null,
          customerPhone: requireCustomer ? dto.customerPhone!.trim() : null,
          notes: typeof dto.notes === 'string' && dto.notes.trim() ? dto.notes.trim() : null,

          orderItems: {
            create: orderItems.map((li) => ({
              menuItemId: li.menuItemId,
              qty: li.qty,
              unitPriceEgp: li.unitPriceEgp,
              lineTotalEgp: li.lineTotalEgp,
            })),
          },
        },
        include: { orderItems: true },
      });

      return { ok: true, order };
    } catch (e: any) {
      throw new BadRequestException(`Order create failed: ${e?.message || e}`);
    }
  }

  async updateStatus(id: string, tenantId: string, status: any) {
    const p = this.prismaAny();
    if (!status) throw new BadRequestException('status required');

    await this.getForTenant(id, tenantId);

    try {
      const order = await p.order.update({
        where: { id },
        data: { status },
      });
      return { ok: true, order };
    } catch (e: any) {
      throw new BadRequestException(`Update failed: ${e?.message || e}`);
    }
  }
}
