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
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcryptjs");
let UsersService = class UsersService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async list(tenantId) {
        return this.prisma.user.findMany({
            where: { tenantId, deleted: false },
            orderBy: { createdAt: 'asc' },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async create(tenantId, dto) {
        const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (exists)
            throw new common_1.ConflictException('Email already exists');
        const hashed = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.user.create({
            data: {
                tenantId,
                email: dto.email,
                password: hashed,
                name: dto.name,
                role: dto.role,
            },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
        return user;
    }
    async updateRole(tenantId, userId, dto) {
        const existing = await this.prisma.user.findFirst({ where: { id: userId, tenantId, deleted: false } });
        if (!existing)
            throw new common_1.NotFoundException('User not found');
        return this.prisma.user.update({
            where: { id: userId },
            data: { role: dto.role },
            select: { id: true, email: true, name: true, role: true, createdAt: true },
        });
    }
    async disable(tenantId, userId) {
        const existing = await this.prisma.user.findFirst({ where: { id: userId, tenantId, deleted: false } });
        if (!existing)
            throw new common_1.NotFoundException('User not found');
        await this.prisma.user.update({ where: { id: userId }, data: { deleted: true } });
        return { ok: true };
    }
};
exports.UsersService = UsersService;
exports.UsersService = UsersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UsersService);
//# sourceMappingURL=users.service.js.map