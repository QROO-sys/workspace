import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateTableDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  laptopSerial?: string;

  @IsOptional()
  @IsString()
  qrUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;
}
