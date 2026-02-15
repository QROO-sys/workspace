import { IsString, IsOptional } from 'class-validator';

export class CreateTableDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  laptopSerial?: string;

  @IsOptional()
  @IsString()
  qrUrl?: string;
}
