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
exports.PublicTableRequestController = void 0;
const common_1 = require("@nestjs/common");
const create_table_request_dto_1 = require("./dto/create-table-request.dto");
const table_request_service_1 = require("./table-request.service");
const sms_service_1 = require("../sms/sms.service");
let PublicTableRequestController = class PublicTableRequestController {
    constructor(tableReq, sms) {
        this.tableReq = tableReq;
        this.sms = sms;
    }
    async create(deskId, dto) {
        const created = await this.tableReq.createForDeskPublic(deskId, dto);
        void this.sms.sendToAdmin(`🔔 Table request: ${created.table.name} → ${created.requestType}${created.message ? ` (${created.message})` : ''}`);
        return { ok: true, id: created.id };
    }
};
exports.PublicTableRequestController = PublicTableRequestController;
__decorate([
    (0, common_1.Post)('desks/:id/requests'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, create_table_request_dto_1.CreateTableRequestDto]),
    __metadata("design:returntype", Promise)
], PublicTableRequestController.prototype, "create", null);
exports.PublicTableRequestController = PublicTableRequestController = __decorate([
    (0, common_1.Controller)('public'),
    __metadata("design:paramtypes", [table_request_service_1.TableRequestService,
        sms_service_1.SmsService])
], PublicTableRequestController);
//# sourceMappingURL=public-table-request.controller.js.map