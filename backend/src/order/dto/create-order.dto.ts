import { Type, Transform } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateOrderItemDto {
  @IsString()
  @IsNotEmpty()
  menuItemId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

function nullToUndefinedString() {
  return Transform(({ value }) => {
    if (value === null || value === undefined) return undefined;
    return String(value);
  });
}

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  tableId!: string;

  @IsOptional()
  @IsString()
  sessionId?: string;

  // ✅ Optional + null-safe
  @IsOptional()
  @nullToUndefinedString()
  @IsString()
  customerName?: string;

  // ✅ Optional + null-safe
  @IsOptional()
  @nullToUndefinedString()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @nullToUndefinedString()
  @IsString()
  notes?: string;

  @IsOptional()
  @nullToUndefinedString()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @nullToUndefinedString()
  @IsString()
  paymentStatus?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
