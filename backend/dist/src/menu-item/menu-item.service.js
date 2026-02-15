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
exports.MenuItemService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
let MenuItemService = class MenuItemService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, tenantId) {
        return this.prisma.menuItem.create({
            data: { ...dto, tenantId }
        });
    }
    async findAll(tenantId) {
        return this.prisma.menuItem.findMany({
            where: { tenantId, deleted: false },
        });
    }
    async findOne(id, tenantId) {
        const item = await this.prisma.menuItem.findFirst({
            where: { id, tenantId, deleted: false }
        });
        if (!item)
            throw new common_1.NotFoundException('MenuItem not found');
        return item;
    }
    async update(id, dto, tenantId) {
        const check = await this.prisma.menuItem.findFirst({ where: { id, tenantId, deleted: false } });
        if (!check)
            throw new common_1.NotFoundException('MenuItem not found');
        return this.prisma.menuItem.update({
            where: { id },
            data: { ...dto }
        });
    }
    async remove(id, tenantId) {
        const check = await this.prisma.menuItem.findFirst({ where: { id, tenantId, deleted: false } });
        if (!check)
            throw new common_1.NotFoundException('MenuItem not found');
        return this.prisma.menuItem.update({
            where: { id },
            data: { deleted: true }
        });
    }
};
exports.MenuItemService = MenuItemService;
exports.MenuItemService = MenuItemService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MenuItemService);
//# sourceMappingURL=menu-item.service.js.map