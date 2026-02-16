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
exports.DbToolsController = void 0;
const common_1 = require("@nestjs/common");
const node_child_process_1 = require("node:child_process");
const node_util_1 = require("node:util");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const owner_guard_1 = require("../auth/owner.guard");
const execFileAsync = (0, node_util_1.promisify)(node_child_process_1.execFile);
let DbToolsController = class DbToolsController {
    ensureEnabled() {
        const enabled = (process.env.ENABLE_DB_TOOLS || '').toLowerCase() === 'true';
        if (!enabled) {
            throw new common_1.BadRequestException('DB tools are disabled. Set ENABLE_DB_TOOLS=true in backend .env');
        }
    }
    async pushSchema(_req) {
        this.ensureEnabled();
        const { stdout, stderr } = await execFileAsync('npx', ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma'], {
            cwd: process.cwd(),
            env: process.env,
        });
        return { ok: true, stdout, stderr };
    }
    async seed(_req) {
        this.ensureEnabled();
        const { stdout, stderr } = await execFileAsync('npm', ['run', 'seed'], {
            cwd: process.cwd(),
            env: process.env,
        });
        return { ok: true, stdout, stderr };
    }
    async resetDb(_req) {
        this.ensureEnabled();
        const { stdout, stderr } = await execFileAsync('npx', ['prisma', 'migrate', 'reset', '--schema', 'prisma/schema.prisma', '--force', '--skip-seed'], { cwd: process.cwd(), env: process.env });
        return { ok: true, stdout, stderr };
    }
};
exports.DbToolsController = DbToolsController;
__decorate([
    (0, common_1.Post)('push'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DbToolsController.prototype, "pushSchema", null);
__decorate([
    (0, common_1.Post)('seed'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DbToolsController.prototype, "seed", null);
__decorate([
    (0, common_1.Post)('reset'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DbToolsController.prototype, "resetDb", null);
exports.DbToolsController = DbToolsController = __decorate([
    (0, common_1.Controller)('db-tools'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, owner_guard_1.OwnerGuard)
], DbToolsController);
//# sourceMappingURL=db-tools.controller.js.map