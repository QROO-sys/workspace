import { IsISO8601, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @IsString()
  tableId!: string;

  // ISO8601 strings from frontend (datetime-local converted to ISO)
  @IsISO8601()
  startAt!: string;

  @IsISO8601()
  endAt!: string;

  @IsOptional()
  @IsString()
  customerName?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
