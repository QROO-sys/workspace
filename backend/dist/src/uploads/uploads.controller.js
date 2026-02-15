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
var _a, _b;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const multer_1 = require("multer");
const path_1 = require("path");
const fs = require("fs");
function ensureDir(path) {
    if (!fs.existsSync(path))
        fs.mkdirSync(path, { recursive: true });
}
let UploadsController = class UploadsController {
    async uploadNationalId(file) {
        if (!file)
            throw new common_1.BadRequestException('No file provided');
        const relative = `/uploads/national-ids/${file.filename}`;
        return { path: relative, filename: file.filename, size: file.size, mime: file.mimetype };
    }
};
exports.UploadsController = UploadsController;
__decorate([
    (0, common_1.Post)('national-id'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        storage: (0, multer_1.diskStorage)({
            destination: (_req, _file, cb) => {
                const dest = (0, path_1.join)(process.cwd(), 'uploads', 'national-ids');
                ensureDir(dest);
                cb(null, dest);
            },
            filename: (_req, file, cb) => {
                const safeBase = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
                const stamp = new Date().toISOString().replace(/[:.]/g, '-');
                cb(null, `${stamp}-${safeBase}`);
            },
        }),
        limits: { fileSize: 10 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const allowed = ['.png', '.jpg', '.jpeg', '.pdf'];
            const ext = (0, path_1.extname)(file.originalname).toLowerCase();
            if (!allowed.includes(ext))
                return cb(new common_1.BadRequestException('Only PNG/JPG/PDF allowed'), false);
            cb(null, true);
        },
    })),
    __param(0, (0, common_1.UploadedFile)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [typeof (_b = typeof Express !== "undefined" && (_a = Express.Multer) !== void 0 && _a.File) === "function" ? _b : Object]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "uploadNationalId", null);
exports.UploadsController = UploadsController = __decorate([
    (0, common_1.Controller)('public/uploads')
], UploadsController);
//# sourceMappingURL=uploads.controller.js.map