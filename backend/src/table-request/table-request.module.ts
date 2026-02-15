import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SmsModule } from '../sms/sms.module';
import { AuthModule } from '../auth/auth.module';
import { PublicTableRequestController } from './public-table-request.controller';
import { TableRequestController } from './table-request.controller';
import { TableRequestService } from './table-request.service';

@Module({
  imports: [SmsModule, AuthModule],
  controllers: [PublicTableRequestController, TableRequestController],
  providers: [TableRequestService, PrismaService],
})
export class TableRequestModule {}
