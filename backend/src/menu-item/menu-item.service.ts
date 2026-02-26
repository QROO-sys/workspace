import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

type CreateMenuItemInput = {
  name: string;
  sku: string;
  price: number;
  categoryId: string;
  description?: string | null;
};

type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

@Injectable()
export class MenuItemService {
  constructor(private prisma: PrismaService) {}

  private p() {
    return this.prisma as any;
  }

  private asNumber(v: any, fallback = 0) {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  private asString(v: any) {
    return typeof v === 'string' ? v : String(v ?? '');
  }

  private isUuid(v: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
  }

  private async assertCategoryForTenant(categoryId: string, tenantId: string) {
    if (!this.isUuid(categoryId)) throw new BadRequestException('categoryId must be a UUID');

    const p = this.p();
    const cat = await p.menuCategory
      .findFirst({ where: { id: categoryId, tenantId, deleted: false } })
      .catch(async () => {
        // fallback schema: tenant relation
        return p.menuCategory.findFirst({ where: { id: categoryId, deleted: false, tenant: { id: tenantId } } });
      });

    if (!cat) throw new BadRequestException('categoryId not found for this tenant');
    return cat;
  }

  async listForTenant(tenantId: string) {
    const p = this.p();
    return p.menuItem
      .findMany({ where: { tenantId, deleted: false }, orderBy: { name: 'asc' } })
      .catch(async () => {
        return p.menuItem.findMany({ where: { deleted: false, tenant: { id: tenantId } }, orderBy: { name: 'asc' } });
      });
  }

  async createForTenant(tenantId: string, input: CreateMenuItemInput) {
    const name = this.asString(input?.name).trim();
    const sku = this.asString(input?.sku).trim().toUpperCase();
    const price = this.asNumber(input?.price, NaN);
    const categoryId = this.asString(input?.categoryId).trim();
    const description = input?.description == null ? null : this.asString(input.description).trim();

    if (!name) throw new BadRequestException('name is required');
    if (!sku) throw new BadRequestException('sku is required');
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('price must be a number >= 0');
    await this.assertCategoryForTenant(categoryId, tenantId);

    const p = this.p();

    // Ensure SKU uniqueness per tenant (soft delete-aware)
    const existing = await p.menuItem
      .findFirst({ where: { tenantId, sku, deleted: false } })
      .catch(async () => p.menuItem.findFirst({ where: { sku, deleted: false, tenant: { id: tenantId } } }));

    if (existing) throw new BadRequestException('sku already exists for this tenant');

    // Create using scalar tenantId/categoryId if available, otherwise connect relations.
    try {
      return await p.menuItem.create({
        data: {
          tenantId,
          categoryId,
          name,
          sku,
          price,
          description,
          deleted: false,
        },
      });
    } catch {
      // fallback: relational fields
      return await p.menuItem.create({
        data: {
          tenant: { connect: { id: tenantId } },
          category: { connect: { id: categoryId } },
          name,
          sku,
          price,
          description,
          deleted: false,
        },
      });
    }
  }

  async updateForTenant(tenantId: string, id: string, input: UpdateMenuItemInput) {
    const p = this.p();

    const existing = await p.menuItem
      .findFirst({ where: { id, tenantId, deleted: false } })
      .catch(async () => p.menuItem.findFirst({ where: { id, deleted: false, tenant: { id: tenantId } } }));

    if (!existing) throw new NotFoundException('Menu item not found');

    const data: any = {};

    if (input.name != null) {
      const name = this.asString(input.name).trim();
      if (!name) throw new BadRequestException('name cannot be empty');
      data.name = name;
    }

    if (input.sku != null) {
      const sku = this.asString(input.sku).trim().toUpperCase();
      if (!sku) throw new BadRequestException('sku cannot be empty');

      const dup = await p.menuItem
        .findFirst({ where: { tenantId, sku, deleted: false, NOT: { id } } })
        .catch(async () =>
          p.menuItem.findFirst({ where: { sku, deleted: false, NOT: { id }, tenant: { id: tenantId } } }),
        );
      if (dup) throw new BadRequestException('sku already exists for this tenant');

      data.sku = sku;
    }

    if (input.price != null) {
      const price = this.asNumber(input.price, NaN);
      if (!Number.isFinite(price) || price < 0) throw new BadRequestException('price must be a number >= 0');
      data.price = price;
    }

    if (input.description !== undefined) {
      data.description = input.description == null ? null : this.asString(input.description).trim();
    }

    if (input.categoryId != null) {
      const categoryId = this.asString(input.categoryId).trim();
      await this.assertCategoryForTenant(categoryId, tenantId);

      // Try scalar first; fallback connect
      try {
        data.categoryId = categoryId;
      } catch {
        data.category = { connect: { id: categoryId } };
      }
    }

    // Perform update using whichever schema works
    try {
      return await p.menuItem.update({ where: { id }, data });
    } catch {
      // Some schemas require composite where; fallback to updateMany
      const updated = await p.menuItem.updateMany({
        where: { id, deleted: false },
        data,
      });
      if (!updated?.count) throw new BadRequestException('Update failed');
      return this.getForTenant(tenantId, id);
    }
  }

  async softDeleteForTenant(tenantId: string, id: string) {
    const p = this.p();

    const existing = await p.menuItem
      .findFirst({ where: { id, tenantId, deleted: false } })
      .catch(async () => p.menuItem.findFirst({ where: { id, deleted: false, tenant: { id: tenantId } } }));

    if (!existing) throw new NotFoundException('Menu item not found');

    try {
      await p.menuItem.update({ where: { id }, data: { deleted: true } });
    } catch {
      await p.menuItem.updateMany({ where: { id }, data: { deleted: true } });
    }

    return { ok: true };
  }

  async getForTenant(tenantId: string, id: string) {
    const p = this.p();
    const item = await p.menuItem
      .findFirst({ where: { id, tenantId, deleted: false } })
      .catch(async () => p.menuItem.findFirst({ where: { id, deleted: false, tenant: { id: tenantId } } }));
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }
}
