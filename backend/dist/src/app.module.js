"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const prisma_service_1 = require("./prisma.service");
const auth_module_1 = require("./auth/auth.module");
const menu_category_module_1 = require("./menu-category/menu-category.module");
const menu_item_module_1 = require("./menu-item/menu-item.module");
const table_module_1 = require("./table/table.module");
const order_module_1 = require("./order/order.module");
const public_module_1 = require("./public/public.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            jwt_1.JwtModule.register({
                global: true,
                secret: process.env.JWT_SECRET || 'changeme',
                signOptions: { expiresIn: '7d' },
            }),
            auth_module_1.AuthModule,
            menu_category_module_1.MenuCategoryModule,
            menu_item_module_1.MenuItemModule,
            table_module_1.TableModule,
            order_module_1.OrderModule,
            public_module_1.PublicModule,
        ],
        providers: [prisma_service_1.PrismaService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map