import { Body, Controller, Param, Post } from '@nestjs/common';
import { CreateTableRequestDto } from './dto/create-table-request.dto';
import { TableRequestService } from './table-request.service';
import { SmsService } from '../sms/sms.service';

@Controller('public')
export class PublicTableRequestController {
  constructor(
    private tableReq: TableRequestService,
    private sms: SmsService
  ) {}

  @Post('desks/:id/requests')
  async create(@Param('id') deskId: string, @Body() dto: CreateTableRequestDto) {
    const created = await this.tableReq.createForDeskPublic(deskId, dto);
    // Fire-and-forget (don't block)
    void this.sms.sendToAdmin(`🔔 Table request: ${created.table.name} → ${created.requestType}${created.message ? ` (${created.message})` : ''}`);
    return { ok: true, id: created.id };
  }
}
