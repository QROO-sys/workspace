import { Type } from 'class-transformer';
import { IsArray, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested, IsISO8601 } from 'class-validator';

export class CreateOrderItemInput {
  @IsUUID()
  menuItemId!: string;

  @IsInt()
  @Min(0)
  quantity!: number;
}

export class CreateGuestOrderDto {
  @IsUUID()
  tableId!: string;

  @IsString()
  customerName!: string;

  @IsString()
  customerPhone!: string;

  @IsOptional()
  @IsString()
  customerNationalIdPath?: string;

  // Optional booking start time (ISO 8601). If omitted, starts now.
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}
