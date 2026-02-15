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
exports.MenuItemController = void 0;
const common_1 = require("@nestjs/common");
const menu_item_service_1 = require("./menu-item.service");
const dto_1 = require("./dto");
const owner_guard_1 = require("../common/guards/owner.guard");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let MenuItemController = class MenuItemController {
    constructor(service) {
        this.service = service;
    }
    async findAll(req) {
        return this.service.findAll(req.user.tenantId);
    }
    async findOne(id, req) {
        return this.service.findOne(id, req.user.tenantId);
    }
    async create(dto, req) {
        return this.service.create(dto, req.user.tenantId);
    }
    async update(id, dto, req) {
        return this.service.update(id, dto, req.user.tenantId);
    }
    async remove(id, req) {
        return this.service.remove(id, req.user.tenantId);
    }
};
exports.MenuItemController = MenuItemController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MenuItemController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MenuItemController.prototype, "findOne", null);
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseGuards)(owner_guard_1.OwnerGuard),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [dto_1.CreateMenuItemDto, Object]),
    __metadata("design:returntype", Promise)
], MenuItemController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, common_1.UseGuards)(owner_guard_1.OwnerGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateMenuItemDto, Object]),
    __metadata("design:returntype", Promise)
], MenuItemController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, common_1.UseGuards)(owner_guard_1.OwnerGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MenuItemController.prototype, "remove", null);
exports.MenuItemController = MenuItemController = __decorate([
    (0, common_1.Controller)('menu-items'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [menu_item_service_1.MenuItemService])
], MenuItemController);
//# sourceMappingURL=menu-item.controller.js.map