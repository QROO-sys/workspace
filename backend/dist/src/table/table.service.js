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
exports.TableService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let TableService = class TableService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(tenantId) {
        return this.prisma.table.findMany({ where: { tenantId, deleted: false }, orderBy: { createdAt: 'asc' } });
    }
    async findOne(id, tenantId) {
        const table = await this.prisma.table.findFirst({ where: { id, tenantId, deleted: false } });
        if (!table)
            throw new common_1.NotFoundException('Desk not found');
        return table;
    }
    async create(dto, tenantId) {
        const base = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
        const created = await this.prisma.table.create({
            data: { name: dto.name, qrUrl: dto.qrUrl || `${base}/d/pending`, laptopSerial: dto.laptopSerial, tenantId }
        });
        const qrUrl = dto.qrUrl || `${base}/d/${created.id}`;
        return this.prisma.table.update({ where: { id: created.id }, data: { qrUrl } });
    }
    async update(id, dto, tenantId) {
        await this.findOne(id, tenantId);
        return this.prisma.table.update({ where: { id }, data: { ...dto } });
    }
    async remove(id, tenantId) {
        await this.findOne(id, tenantId);
        return this.prisma.table.update({ where: { id }, data: { deleted: true } });
    }
};
exports.TableService = TableService;
exports.TableService = TableService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TableService);
//# sourceMappingURL=table.service.js.map