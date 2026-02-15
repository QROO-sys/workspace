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
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma.service");
const bcrypt = require("bcryptjs");
const jwt_1 = require("@nestjs/jwt");
const client_1 = require("@prisma/client");
let AuthService = class AuthService {
    constructor(prisma, jwtService) {
        this.prisma = prisma;
        this.jwtService = jwtService;
    }
    async register(email, password, name, role = client_1.Role.OWNER, tenantId, tenantName) {
        if (!email || !password)
            throw new common_1.BadRequestException('Missing email/password');
        const userExists = await this.prisma.user.findUnique({ where: { email } });
        if (userExists)
            throw new common_1.ConflictException('Email already registered');
        let tenant = tenantId
            ? await this.prisma.tenant.findFirst({ where: { id: tenantId, deleted: false } })
            : null;
        if (!tenant) {
            const nameGuess = tenantName?.trim() || `${email.split('@')[0]}'s Workspace`;
            tenant = await this.prisma.tenant.create({ data: { name: nameGuess } });
        }
        const hashed = await bcrypt.hash(password, 10);
        const user = await this.prisma.user.create({
            data: { email, password: hashed, role, name, tenantId: tenant.id }
        });
        return this.issueToken(user);
    }
    async validateUser(email, password) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        return user;
    }
    async login(email, password) {
        const user = await this.validateUser(email, password);
        return this.issueToken(user);
    }
    issueToken(user) {
        const payload = {
            sub: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: user.role
        };
        return {
            access_token: this.jwtService.sign(payload)
        };
    }
    async verifyToken(token) {
        try {
            const payload = await this.jwtService.verifyAsync(token);
            const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
            if (!user)
                throw new common_1.UnauthorizedException();
            return { ...payload, user };
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, typeof (_a = typeof jwt_1.JwtService !== "undefined" && jwt_1.JwtService) === "function" ? _a : Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map