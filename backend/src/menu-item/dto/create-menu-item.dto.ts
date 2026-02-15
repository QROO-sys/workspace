import { IsString, IsNumber, IsUUID, IsOptional } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name!: string;

  @IsString()
  sku!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  price!: number;

  @IsUUID()
  categoryId!: string;
}