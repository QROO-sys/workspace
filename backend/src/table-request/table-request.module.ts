import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { SmsModule } from '../sms/sms.module';
import { PublicTableRequestController } from './public-table-request.controller';
import { TableRequestController } from './table-request.controller';
import { TableRequestService } from './table-request.service';

@Module({
  imports: [SmsModule],
  controllers: [PublicTableRequestController, TableRequestController],
  providers: [TableRequestService, PrismaService],
})
export class TableRequestModule {}
