import { Controller, Get, Param, Patch, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TableRequestService } from './table-request.service';

@Controller('table-requests')
@UseGuards(JwtAuthGuard)
export class TableRequestController {
  constructor(private tableReq: TableRequestService) {}

  @Get()
  async list(@Req() req: any) {
    return this.tableReq.listActiveForTenant(req.user.tenantId);
  }

  @Patch(':id/resolve')
  async resolve(@Req() req: any, @Param('id') id: string) {
    await this.tableReq.resolveForTenant(req.user.tenantId, id);
    return { ok: true };
  }
}
