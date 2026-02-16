import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTableRequestDto } from './dto/create-table-request.dto';

@Injectable()
export class TableRequestService {
  constructor(private prisma: PrismaService) {}

  async createForDeskPublic(deskId: string, dto: CreateTableRequestDto) {
    const desk = await this.prisma.table.findFirst({ where: { id: deskId, deleted: false } });
    if (!desk) throw new NotFoundException('Desk not found');

    return this.prisma.tableRequest.create({
      data: {
        tenantId: desk.tenantId,
        tableId: desk.id,
        requestType: dto.requestType,
        message: dto.message,
        isActive: true,
      },
      include: { table: true },
    });
  }

  async listActiveForTenant(tenantId: string) {
    return this.prisma.tableRequest.findMany({
      where: { tenantId, deleted: false, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { table: true },
      take: 100,
    });
  }

  async resolveForTenant(tenantId: string, id: string) {
    const existing = await this.prisma.tableRequest.findFirst({ where: { id, tenantId, deleted: false } });
    if (!existing) throw new NotFoundException('Request not found');
    return this.prisma.tableRequest.update({ where: { id }, data: { isActive: false } });
  }
}
