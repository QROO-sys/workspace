"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMenuItemDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_menu_item_dto_1 = require("./create-menu-item.dto");
class UpdateMenuItemDto extends (0, mapped_types_1.PartialType)(create_menu_item_dto_1.CreateMenuItemDto) {
}
exports.UpdateMenuItemDto = UpdateMenuItemDto;
//# sourceMappingURL=update-menu-item.dto.js.map