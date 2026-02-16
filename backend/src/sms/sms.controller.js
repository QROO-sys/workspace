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
exports.SmsController = void 0;
const common_1 = require("@nestjs/common");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
const owner_guard_1 = require("../common/guards/owner.guard");
const sms_service_1 = require("./sms.service");
let SmsController = class SmsController {
    constructor(sms) {
        this.sms = sms;
    }
    async test(req, body) {
        const to = (body?.to || process.env.SMS_ADMIN_TO || '').trim();
        const msg = String(body?.message ?? `QROO test SMS from ${req.user?.email || 'owner'}`).trim();
        const res = await this.sms.send(to, msg);
        return { to, provider: process.env.SMS_PROVIDER || 'console', ...res };
    }
};
exports.SmsController = SmsController;
__decorate([
    (0, common_1.Post)('test'),
    (0, common_1.UseGuards)(owner_guard_1.OwnerGuard),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], SmsController.prototype, "test", null);
exports.SmsController = SmsController = __decorate([
    (0, common_1.Controller)('sms'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [sms_service_1.SmsService])
], SmsController);
//# sourceMappingURL=sms.controller.js.map