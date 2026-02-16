import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTableDto, UpdateTableDto } from './dto';

@Injectable()
export class TableService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.table.findMany({ where: { tenantId, deleted: false }, orderBy: { createdAt: 'asc' } });
  }

  async findOne(id: string, tenantId: string) {
    const table = await this.prisma.table.findFirst({ where: { id, tenantId, deleted: false } });
    if (!table) throw new NotFoundException('Desk not found');
    return table;
  }

  async create(dto: CreateTableDto, tenantId: string) {
    const base = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';

    // Create first, then lock the QR link to the actual deskId (stable and unique)
    const created = await this.prisma.table.create({
      data: {
        name: dto.name,
        qrUrl: dto.qrUrl || `${base}/d/pending`,
        laptopSerial: dto.laptopSerial,
        hourlyRate: dto.hourlyRate ?? 100,
        tenantId,
      }
    });

    const qrUrl = dto.qrUrl || `${base}/d/${created.id}`;
    return this.prisma.table.update({ where: { id: created.id }, data: { qrUrl } });
  }

  async update(id: string, dto: UpdateTableDto, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.table.update({ where: { id }, data: { ...dto } });
  }

  async remove(id: string, tenantId: string) {
    await this.findOne(id, tenantId);
    return this.prisma.table.update({ where: { id }, data: { deleted: true } });
  }

  async bulkSetHourlyRate(tenantId: string, hourlyRate: number) {
    const res = await this.prisma.table.updateMany({
      where: { tenantId, deleted: false },
      data: { hourlyRate },
    });
    return { updated: res.count };
  }
}
