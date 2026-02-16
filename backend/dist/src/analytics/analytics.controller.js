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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const roles_guard_1 = require("../common/guards/roles.guard");
const analytics_service_1 = require("./analytics.service");
let AnalyticsController = class AnalyticsController {
    constructor(analytics) {
        this.analytics = analytics;
    }
    async daily(req, days) {
        let nDays = Number(days) || 30;
        if (req.user?.role === client_1.Role.STAFF) {
            nDays = Math.min(Math.max(nDays, 1), 7);
        }
        const data = await this.analytics.dailyRevenue(req.tenantId, nDays);
        if (req.user?.role === client_1.Role.STAFF) {
            return { days: nDays, data };
        }
        const totals = data.reduce((acc, d) => ({ gross: acc.gross + d.gross, completed: acc.completed + d.completed }), { gross: 0, completed: 0 });
        return { days: nDays, totals, data };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('revenue/daily'),
    (0, roles_decorator_1.Roles)(client_1.Role.OWNER, client_1.Role.MANAGER, client_1.Role.STAFF),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "daily", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map