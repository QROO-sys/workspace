import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { verifyAgreementToken } from '../public/laptop-agreement.util';

const EXTRA_HOUR_SKU = 'EXTRA_HOUR';
const POLICY_VERSION = 'v0.1';

type CreateOrderDtoLike = {
  deskId?: string;
  tableId?: string;
  agreementToken?: string;

  items?: Array<{
    itemId?: string;
    menuItemId?: string;
    qty?: number;
    quantity?: number;
  }>;

  customerName?: string;
  customerPhone?: string;
};

type NormalizedItem = { menuItemId: string; qty: number };

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  private prismaAny() {
    return this.prisma as any;
  }

  private getAgreementSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new BadRequestException('Server misconfigured: JWT_SECRET missing');
    return secret;
  }

  // Controller compatibility
  async list(req: any) {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId missing');

    const since = req?.query?.since;
    if (since) return this.listForTenantSince(tenantId, since);
    return this.listForTenant(tenantId);
  }

  async create(req: any, body: any) {
    const tenantId = req?.user?.tenantId;
    if (!tenantId) throw new BadRequestException('tenantId missing');
    return this.createOwnerOrder(tenantId, body);
  }

  private getResourceModelName(): 'table' | 'desk' {
    const p = this.prismaAny();
    if (p.table) return 'table';
    if (p.desk) return 'desk';
    throw new BadRequestException('Neither Prisma model "table" nor "desk" exists');
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

  private resolvePrice(menuItem: any): number {
    const candidates = [
      menuItem.priceEgp,
      menuItem.priceEGP,
      menuItem.price,
      menuItem.unitPriceEgp,
      menuItem.unitPriceEGP,
      menuItem.unitPrice,
      menuItem.amount,
      menuItem.amountEgp,
      menuItem.amountEGP,
    ].filter((v) => typeof v === 'number' && Number.isFinite(v));
    if (candidates.length === 0) throw new BadRequestException(`Menu item "${menuItem?.id}" has no numeric price field`);
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
    const resource = await p[model].findFirst({ where: { id: resourceId } });
    if (!resource) throw new NotFoundException('Desk not found');
    if (!resource.tenantId) throw new BadRequestException(`${model} has no tenantId`);
    return { resource, tenantId: resource.tenantId as string, model };
  }

  private async loadMenuItems(tenantId: string, menuItemIds: string[]) {
    const p = this.prismaAny();
    const menuItems = await p.menuItem.findMany({ where: { id: { in: menuItemIds }, tenantId } });
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
      const unitPrice = this.resolvePrice(mi);
      return { menuItemId: mi.id, qty: i.qty, unitPrice, lineTotal: unitPrice * i.qty };
    });
    const total = orderItems.reduce((s, li) => s + li.lineTotal, 0);
    return { orderItems, total };
  }

  private enforceAgreement(dto: CreateOrderDtoLike, expectedTenantId: string, expectedModel: 'table' | 'desk', expectedId: string) {
    const token = dto.agreementToken;
    if (!token) throw new BadRequestException('Laptop agreement signature required before starting a session');

    const payload = verifyAgreementToken(token, this.getAgreementSecret());

    if (payload.v !== POLICY_VERSION) throw new BadRequestException('Agreement policy version mismatch');
    if (payload.tenantId !== expectedTenantId) throw new BadRequestException('Agreement tenant mismatch');
    if (payload.resourceType !== expectedModel) throw new BadRequestException('Agreement resource type mismatch');
    if (payload.resourceId !== expectedId) throw new BadRequestException('Agreement desk mismatch');
  }

  // List APIs
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

  // Create (owner/staff)
  async createOwnerOrder(tenantId: string, dto: CreateOrderDtoLike) {
    const p = this.prismaAny();

    const resourceId = this.getResourceId(dto);
    const { resource, tenantId: resourceTenantId, model } = await this.loadResourceAndTenant(resourceId);
    if (resourceTenantId !== tenantId) throw new BadRequestException('Desk tenant mismatch');

    // HARD GATE
    this.enforceAgreement(dto, tenantId, model, resource.id);

    const items = this.normalizeItems(dto);
    const menuItemIds = items.map((i) => i.menuItemId);
    const menuItems = await this.loadMenuItems(tenantId, menuItemIds);

    const requireCustomer = this.mustRequireCustomerInfo(menuItems);
    this.validateCustomerInfoIfNeeded(requireCustomer, dto);

    const { orderItems, total } = this.buildOrderItems(menuItems, items);

    try {
      const order = await p.order.create({
        data: {
          tenantId,
          ...(model === 'table' ? { tableId: resource.id } : { deskId: resource.id }),
          total,
          customerName: requireCustomer ? dto.customerName!.trim() : null,
          customerPhone: requireCustomer ? dto.customerPhone!.trim() : null,
          orderItems: {
            create: orderItems.map((li) => ({
              menuItemId: li.menuItemId,
              qty: li.qty,
              unitPrice: li.unitPrice,
              lineTotal: li.lineTotal,
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
}
