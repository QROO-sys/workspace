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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PublicController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../prisma.service");
let PublicController = class PublicController {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async deskWithMenu(id) {
        const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
        if (!desk)
            throw new common_1.NotFoundException('Desk not found');
        const menuItems = await this.prisma.menuItem.findMany({
            where: { tenantId: desk.tenantId, deleted: false },
            orderBy: { name: 'asc' },
        });
        return { desk, menuItems };
    }
    async availabilityForDesk(id, date, from, to) {
        const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
        if (!desk)
            throw new common_1.NotFoundException('Desk not found');
        let rangeFrom;
        let rangeTo;
        if (from && to) {
            rangeFrom = new Date(from);
            rangeTo = new Date(to);
        }
        else {
            const d = date ? new Date(`${date}T00:00:00`) : new Date();
            rangeFrom = new Date(d);
            rangeFrom.setHours(0, 0, 0, 0);
            rangeTo = new Date(rangeFrom);
            rangeTo.setDate(rangeTo.getDate() + 1);
        }
        const occupiedOrders = await this.prisma.order.findMany({
            where: {
                tenantId: desk.tenantId,
                tableId: desk.id,
                deleted: false,
                status: { notIn: [client_1.OrderStatus.CANCELLED] },
                startAt: { lt: rangeTo },
                OR: [{ endAt: null }, { endAt: { gt: rangeFrom } }],
            },
            select: { id: true, status: true, startAt: true, endAt: true },
            orderBy: { startAt: 'asc' },
        });
        const occupiedBookings = await this.prisma.booking.findMany({
            where: {
                tenantId: desk.tenantId,
                tableId: desk.id,
                deleted: false,
                status: { notIn: [client_1.BookingStatus.CANCELLED] },
                startAt: { lt: rangeTo },
                endAt: { gt: rangeFrom },
            },
            select: { id: true, status: true, startAt: true, endAt: true },
            orderBy: { startAt: 'asc' },
        });
        const occupied = [
            ...occupiedOrders.map((o) => ({ id: o.id, kind: 'order', status: o.status, startAt: o.startAt, endAt: o.endAt })),
            ...occupiedBookings.map((b) => ({ id: b.id, kind: 'booking', status: b.status, startAt: b.startAt, endAt: b.endAt })),
        ].sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        return { from: rangeFrom.toISOString(), to: rangeTo.toISOString(), occupied };
    }
    async upcomingForDesk(id) {
        const desk = await this.prisma.table.findFirst({ where: { id, deleted: false } });
        if (!desk)
            throw new common_1.NotFoundException('Desk not found');
        const now = new Date();
        const upcoming = await this.prisma.order.findMany({
            where: {
                tenantId: desk.tenantId,
                tableId: desk.id,
                deleted: false,
                status: { notIn: [client_1.OrderStatus.CANCELLED, client_1.OrderStatus.COMPLETED] },
                startAt: { gt: now },
            },
            orderBy: { startAt: 'asc' },
            take: 10,
            include: { orderItems: { include: { menuItem: true } } },
        });
        return { upcoming };
    }
    async publicOrder(id) {
        const order = await this.prisma.order.findFirst({
            where: { id, deleted: false },
            include: {
                table: { select: { id: true, name: true, qrUrl: true, hourlyRate: true } },
                orderItems: { include: { menuItem: true } },
            },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        return order;
    }
};
exports.PublicController = PublicController;
__decorate([
    (0, common_1.Get)('desks/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "deskWithMenu", null);
__decorate([
    (0, common_1.Get)('desks/:id/availability'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Query)('date')),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "availabilityForDesk", null);
__decorate([
    (0, common_1.Get)('desks/:id/upcoming'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "upcomingForDesk", null);
__decorate([
    (0, common_1.Get)('orders/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], PublicController.prototype, "publicOrder", null);
exports.PublicController = PublicController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PublicController);
//# sourceMappingURL=public.controller.js.map