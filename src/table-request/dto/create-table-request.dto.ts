import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { RequestType } from '@prisma/client';

export class CreateTableRequestDto {
  @IsEnum(RequestType)
  requestType!: RequestType;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  message?: string;
}
