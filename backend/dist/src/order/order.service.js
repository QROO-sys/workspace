"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
function norm(s) {
    return (s || '').trim().toLowerCase();
}
const SKU_EXTRA_HOUR = '001';
const SKU_COFFEE = '002';
let OrderService = class OrderService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listForTenant(tenantId) {
        return this.prisma.order.findMany({
            where: { tenantId, deleted: false },
            orderBy: { createdAt: 'desc' },
            include: {
                table: true,
                orderItems: { include: { menuItem: true } },
            },
        });
    }
    async getForTenant(id, tenantId) {
        const order = await this.prisma.order.findFirst({
            where: { id, tenantId, deleted: false },
            include: { table: true, orderItems: { include: { menuItem: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
    async createGuestOrder(dto) {
        const table = await this.prisma.table.findFirst({
            where: { id: dto.tableId, deleted: false },
        });
        if (!table)
            throw new common_1.NotFoundException('Desk not found');
        const tenantId = table.tenantId;
        return this.createOrderInternal(table.id, tenantId, dto);
    }
    async createOwnerOrder(tenantId, dto) {
        const table = await this.prisma.table.findFirst({
            where: { id: dto.tableId, tenantId, deleted: false },
        });
        if (!table)
            throw new common_1.NotFoundException('Desk not found');
        return this.createOrderInternal(table.id, tenantId, dto);
    }
    async upcomingForTenant(tenantId) {
        const now = new Date();
        return this.prisma.order.findMany({
            where: {
                tenantId,
                deleted: false,
                status: { notIn: [client_1.OrderStatus.CANCELLED, client_1.OrderStatus.COMPLETED] },
                startAt: { gt: now },
            },
            orderBy: { startAt: 'asc' },
            include: { table: true, orderItems: { include: { menuItem: true } } },
        });
    }
    async createOrderInternal(tableId, tenantId, dto) {
        const items = (dto.items || []).filter(i => i.quantity > 0);
        if (items.length === 0)
            throw new common_1.BadRequestException('No items');
        const ids = items.map(i => i.menuItemId);
        const menuItems = await this.prisma.menuItem.findMany({
            where: { id: { in: ids }, tenantId, deleted: false },
        });
        const byId = new Map(menuItems.map(mi => [mi.id, mi]));
        let hoursQty = 0;
        let coffeeQty = 0;
        for (const it of items) {
            const mi = byId.get(it.menuItemId);
            if (!mi)
                throw new common_1.BadRequestException('Invalid item');
            const isExtraHour = mi.sku === SKU_EXTRA_HOUR || norm(mi.name) === 'extra hour';
            const isCoffee = mi.sku === SKU_COFFEE || norm(mi.name) === 'coffee';
            if (isExtraHour)
                hoursQty += it.quantity;
            if (isCoffee)
                coffeeQty += it.quantity;
        }
        if (hoursQty <= 0) {
            throw new common_1.BadRequestException('You must add at least 1 hour (Extra hour)');
        }
        const now = new Date();
        let startAt = now;
        if (dto.startAt) {
            const parsed = new Date(dto.startAt);
            if (isNaN(parsed.getTime()))
                throw new common_1.BadRequestException('Invalid start time');
            if (parsed.getTime() < now.getTime() - 5 * 60 * 1000) {
                throw new common_1.BadRequestException('Start time is in the past');
            }
            startAt = parsed.getTime() < now.getTime() + 5 * 60 * 1000 ? now : parsed;
        }
        const endAt = new Date(startAt.getTime() + hoursQty * 60 * 60 * 1000);
        const overlap = await this.prisma.order.findFirst({
            where: {
                tenantId,
                tableId,
                deleted: false,
                status: { notIn: [client_1.OrderStatus.CANCELLED, client_1.OrderStatus.COMPLETED] },
                startAt: { lt: endAt },
                endAt: { gt: startAt },
            },
            select: { id: true, startAt: true, endAt: true },
        });
        if (overlap) {
            throw new common_1.BadRequestException('Desk is already booked for that time slot');
        }
        const freeCoffee = hoursQty;
        const freeCoffeeUsed = Math.min(coffeeQty, freeCoffee);
        const paidCoffeeQty = Math.max(0, coffeeQty - freeCoffee);
        const orderItemsData = [];
        for (const it of items) {
            const mi = byId.get(it.menuItemId);
            const isCoffee = mi.sku === SKU_COFFEE || norm(mi.name) === 'coffee';
            if (isCoffee) {
                continue;
            }
            orderItemsData.push({
                menuItemId: mi.id,
                quantity: it.quantity,
                price: mi.price,
            });
        }
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
                status: isFutureBooking ? client_1.OrderStatus.CONFIRMED : client_1.OrderStatus.PENDING,
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                startAt,
                endAt,
                orderItems: {
                    create: orderItemsData,
                },
            },
            include: { table: true, orderItems: { include: { menuItem: true } } },
        });
        return order;
    }
    async updateStatus(id, tenantId, status) {
        await this.getForTenant(id, tenantId);
        return this.prisma.order.update({ where: { id }, data: { status } });
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrderService);
//# sourceMappingURL=order.service.js.map