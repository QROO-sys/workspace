import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateGuestOrderDto } from './dto';
import { OrderStatus, RequestType } from '@prisma/client';
import { SmsService } from '../sms/sms.service';

function norm(s: string) {
  return (s || '').trim().toLowerCase();
}

const SKU_EXTRA_HOUR = '001';
const SKU_COFFEE = '002';

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private sms: SmsService
  ) {}

  async listForTenant(tenantId: string) {
    return this.prisma.order.findMany({
      where: { tenantId, deleted: false },
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        orderItems: { include: { menuItem: true } },
      },
    });
  }

  async getForTenant(id: string, tenantId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id, tenantId, deleted: false },
      include: { table: true, orderItems: { include: { menuItem: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }


  async createGuestOrder(dto: CreateGuestOrderDto) {
    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, deleted: false },
    });
    if (!table) throw new NotFoundException('Desk not found');

    const tenantId = table.tenantId;
    return this.createOrderInternal(table.id, tenantId, dto, 'GUEST');
  }

  // Owner creates a future booking or a walk-in session (auth required)
  async createOwnerOrder(tenantId: string, dto: CreateGuestOrderDto) {
    const table = await this.prisma.table.findFirst({
      where: { id: dto.tableId, tenantId, deleted: false },
    });
    if (!table) throw new NotFoundException('Desk not found');
    return this.createOrderInternal(table.id, tenantId, dto, 'STAFF');
  }

  async upcomingForTenant(tenantId: string) {
    const now = new Date();
    return this.prisma.order.findMany({
      where: {
        tenantId,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        startAt: { gt: now },
      },
      orderBy: { startAt: 'asc' },
      include: { table: true, orderItems: { include: { menuItem: true } } },
    });
  }

  private async createOrderInternal(
    tableId: string,
    tenantId: string,
    dto: CreateGuestOrderDto,
    source: 'GUEST' | 'STAFF',
  ) {
    const items = (dto.items || []).filter(i => i.quantity > 0);
    if (items.length === 0) throw new BadRequestException('No items');

    const ids = items.map(i => i.menuItemId);
    const menuItems = await this.prisma.menuItem.findMany({
      where: { id: { in: ids }, tenantId, deleted: false },
    });

    const byId = new Map(menuItems.map(mi => [mi.id, mi]));

    // Identify "Extra hour" and "Coffee" by SKU (stable even if names change)
    let hoursQty = 0;
    let coffeeQty = 0;

    for (const it of items) {
      const mi = byId.get(it.menuItemId);
      if (!mi) throw new BadRequestException('Invalid item');

      const isExtraHour = mi.sku === SKU_EXTRA_HOUR || norm(mi.name) === 'extra hour';
      const isCoffee = mi.sku === SKU_COFFEE || norm(mi.name) === 'coffee';

      if (isExtraHour) hoursQty += it.quantity;
      if (isCoffee) coffeeQty += it.quantity;
    }

    if (hoursQty <= 0) {
      throw new BadRequestException('You must add at least 1 hour (Extra hour)');
    }

    const table = await this.prisma.table.findFirst({
      where: { id: tableId, tenantId, deleted: false },
      select: { id: true, name: true, hourlyRate: true },
    });
    if (!table) throw new NotFoundException('Desk not found');

    // Start/end time for the session or future booking
    const now = new Date();
    let startAt = now;
    if (dto.startAt) {
      const parsed = new Date(dto.startAt);
      if (isNaN(parsed.getTime())) throw new BadRequestException('Invalid start time');
      // Reject clearly-in-the-past bookings
      if (parsed.getTime() < now.getTime() - 5 * 60 * 1000) {
        throw new BadRequestException('Start time is in the past');
      }
      // If it's "about now" (within 5 minutes), treat it as now
      startAt = parsed.getTime() < now.getTime() + 5 * 60 * 1000 ? now : parsed;
    }

    const endAt = new Date(startAt.getTime() + hoursQty * 60 * 60 * 1000);

    // Prevent double-booking the same desk
    const overlap = await this.prisma.order.findFirst({
      where: {
        tenantId,
        tableId,
        deleted: false,
        status: { notIn: [OrderStatus.CANCELLED, OrderStatus.COMPLETED] },
        startAt: { lt: endAt },
        endAt: { gt: startAt },
      },
      select: { id: true, startAt: true, endAt: true },
    });

    if (overlap) {
      throw new BadRequestException('Desk is already booked for that time slot');
    }

    const freeCoffee = hoursQty;
    const freeCoffeeUsed = Math.min(coffeeQty, freeCoffee);
    const paidCoffeeQty = Math.max(0, coffeeQty - freeCoffee);

    // Build orderItems; we may split coffee into free and paid lines.
    const orderItemsData: Array<{ menuItemId: string; quantity: number; price: number; }> = [];

    for (const it of items) {
      const mi = byId.get(it.menuItemId)!;
      const isCoffee = mi.sku === SKU_COFFEE || norm(mi.name) === 'coffee';
      const isExtraHour = mi.sku === SKU_EXTRA_HOUR || norm(mi.name) === 'extra hour';

      if (isCoffee) {
        // We'll add coffee lines after the loop
        continue;
      }

      orderItemsData.push({
        menuItemId: mi.id,
        quantity: it.quantity,
        price: isExtraHour ? table.hourlyRate : mi.price,
      });
    }

    // Add coffee line(s)
    const coffeeMi = menuItems.find(mi => mi.sku === SKU_COFFEE || norm(mi.name) === 'coffee');
    if (coffeeMi) {
      if (freeCoffeeUsed > 0) {
        orderItemsData.push({
          menuItemId: coffeeMi.id,
          quantity: freeCoffeeUsed,
          price: 0,
        });
      }
      if (paidCoffeeQty > 0) {
        orderItemsData.push({
          menuItemId: coffeeMi.id,
          quantity: paidCoffeeQty,
          price: coffeeMi.price,
        });
      }
    }

    const total = orderItemsData.reduce((sum, li) => sum + li.price * li.quantity, 0);

    const isFutureBooking = startAt.getTime() > now.getTime() + 5 * 60 * 1000;

    const order = await this.prisma.order.create({
      data: {
        tenantId,
        tableId,
        total,
        status: isFutureBooking ? OrderStatus.CONFIRMED : OrderStatus.PENDING,
        customerName: dto.customerName,
        customerPhone: dto.customerPhone,
        customerNationalIdPath: dto.customerNationalIdPath,
        startAt,
        endAt,
        orderItems: {
          create: orderItemsData,
        },
      },
      include: { table: true, orderItems: { include: { menuItem: true } } },
    });

    void this.sms.sendToAdmin(
      `🧾 New order: ${order.table.name} | ${order.orderItems.length} items | total ${order.total}${order.customerName ? ` | ${order.customerName}` : ''}${order.customerPhone ? ` (${order.customerPhone})` : ''}`
    );

    // Also add to the in-app "requests" queue for admin/staff.
    if (source === 'GUEST') {
      const summary = order.orderItems
        .map((oi) => `${oi.quantity}x ${oi.menuItem?.name ?? 'Item'}`)
        .join(', ');
      await this.prisma.tableRequest
        .create({
          data: {
            tenantId,
            tableId,
            requestType: RequestType.OTHER,
            message: `New guest order: ${summary || 'Order'} (Total ${order.total} EGP)`,
            isActive: true,
          },
        })
        .catch(() => void 0);
    }

    return order;
  }

  async updateStatus(id: string, tenantId: string, status: OrderStatus) {
    await this.getForTenant(id, tenantId);
    return this.prisma.order.update({ where: { id }, data: { status } });
  }
}
