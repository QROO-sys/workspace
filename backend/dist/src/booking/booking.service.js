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
exports.BookingService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const client_1 = require("@prisma/client");
function toDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime()))
        throw new common_1.BadRequestException('Invalid date');
    return d;
}
function validateRange(startAt, endAt) {
    if (!(startAt instanceof Date) || !(endAt instanceof Date)) {
        throw new common_1.BadRequestException('Invalid date range');
    }
    if (startAt >= endAt) {
        throw new common_1.BadRequestException('startAt must be before endAt');
    }
    const maxHours = 24;
    const diffHrs = (endAt.getTime() - startAt.getTime()) / (1000 * 60 * 60);
    if (diffHrs > maxHours) {
        throw new common_1.BadRequestException(`Booking too long (max ${maxHours} hours)`);
    }
}
let BookingService = class BookingService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async ensureDesk(tableId) {
        const desk = await this.prisma.table.findFirst({ where: { id: tableId, deleted: false } });
        if (!desk)
            throw new common_1.NotFoundException('Desk not found');
        return desk;
    }
    async ensureNoOverlap(tenantId, tableId, startAt, endAt) {
        const overlap = await this.prisma.booking.findFirst({
            where: {
                tenantId,
                tableId,
                deleted: false,
                status: { in: [client_1.BookingStatus.RESERVED, client_1.BookingStatus.CHECKED_IN] },
                AND: [
                    { startAt: { lt: endAt } },
                    { endAt: { gt: startAt } },
                ],
            },
        });
        if (overlap) {
            throw new common_1.BadRequestException('That time slot is already booked');
        }
    }
    async listForTenant(tenantId, query) {
        const now = new Date();
        const from = query?.from ? toDate(query.from) : new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const to = query?.to ? toDate(query.to) : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const where = {
            tenantId,
            deleted: false,
            AND: [{ startAt: { lt: to } }, { endAt: { gt: from } }],
        };
        if (query?.tableId)
            where.tableId = query.tableId;
        if (query?.status)
            where.status = query.status;
        return this.prisma.booking.findMany({
            where,
            orderBy: { startAt: 'asc' },
            include: { table: true },
        });
    }
    async createForTenant(tenantId, createdByUserId, dto) {
        const desk = await this.ensureDesk(dto.tableId);
        if (desk.tenantId !== tenantId)
            throw new common_1.NotFoundException('Desk not found');
        const startAt = toDate(dto.startAt);
        const endAt = toDate(dto.endAt);
        validateRange(startAt, endAt);
        await this.ensureNoOverlap(tenantId, desk.id, startAt, endAt);
        return this.prisma.booking.create({
            data: {
                tenantId,
                tableId: desk.id,
                startAt,
                endAt,
                status: client_1.BookingStatus.RESERVED,
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                notes: dto.notes,
                createdByUserId,
            },
            include: { table: true },
        });
    }
    async cancelForTenant(tenantId, id) {
        const existing = await this.prisma.booking.findFirst({ where: { id, tenantId, deleted: false } });
        if (!existing)
            throw new common_1.NotFoundException('Booking not found');
        return this.prisma.booking.update({
            where: { id },
            data: { status: client_1.BookingStatus.CANCELLED },
            include: { table: true },
        });
    }
    async listForDeskPublic(deskId, from, to) {
        const desk = await this.ensureDesk(deskId);
        const start = toDate(from);
        const end = toDate(to);
        validateRange(start, end);
        return this.prisma.booking.findMany({
            where: {
                tenantId: desk.tenantId,
                tableId: desk.id,
                deleted: false,
                status: { in: [client_1.BookingStatus.RESERVED, client_1.BookingStatus.CHECKED_IN] },
                AND: [{ startAt: { lt: end } }, { endAt: { gt: start } }],
            },
            orderBy: { startAt: 'asc' },
            select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
            },
        });
    }
    async createPublicForDesk(deskId, dto) {
        const desk = await this.ensureDesk(deskId);
        const startAt = toDate(dto.startAt);
        const endAt = toDate(dto.endAt);
        validateRange(startAt, endAt);
        await this.ensureNoOverlap(desk.tenantId, desk.id, startAt, endAt);
        return this.prisma.booking.create({
            data: {
                tenantId: desk.tenantId,
                tableId: desk.id,
                startAt,
                endAt,
                status: client_1.BookingStatus.RESERVED,
                customerName: dto.customerName,
                customerPhone: dto.customerPhone,
                notes: dto.notes,
                createdByUserId: null,
            },
            select: {
                id: true,
                startAt: true,
                endAt: true,
                status: true,
            },
        });
    }
};
exports.BookingService = BookingService;
exports.BookingService = BookingService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], BookingService);
//# sourceMappingURL=booking.service.js.map