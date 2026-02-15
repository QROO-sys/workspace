"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateMenuCategoryDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_menu_category_dto_1 = require("./create-menu-category.dto");
class UpdateMenuCategoryDto extends (0, mapped_types_1.PartialType)(create_menu_category_dto_1.CreateMenuCategoryDto) {
}
exports.UpdateMenuCategoryDto = UpdateMenuCategoryDto;
//# sourceMappingURL=update-menu-category.dto.js.map