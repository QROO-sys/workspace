import { IsString } from 'class-validator';
export class CreateMenuCategoryDto {
  @IsString()
  name!: string;
}