import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsOptional, IsString, IsUUID, Min, ValidateNested, IsISO8601 } from 'class-validator';

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

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  // Optional booking start time (ISO 8601). If omitted, starts now.
  @IsOptional()
  @IsISO8601()
  startAt?: string;

  // Must be accepted when starting/booking a session.
  @IsBoolean()
  laptopPolicyAccepted!: boolean;

  @IsOptional()
  @IsString()
  laptopPolicyVersion?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemInput)
  items!: CreateOrderItemInput[];
}
