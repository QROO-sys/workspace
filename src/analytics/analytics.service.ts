import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async dailyRevenue(tenantId: string, days: number) {
    const safeDays = Math.max(1, Math.min(365, Number(days) || 30));

    // Raw SQL because Prisma can't group by date_trunc.
    const rows: any[] = await this.prisma.$queryRaw`
      SELECT
        to_char(date_trunc('day', "createdAt"), 'YYYY-MM-DD') AS day,
        COALESCE(SUM(CASE WHEN "deleted" = false AND "status" != 'CANCELLED' THEN "total" ELSE 0 END), 0) AS gross,
        COALESCE(SUM(CASE WHEN "deleted" = false AND "status" = 'COMPLETED' THEN "total" ELSE 0 END), 0) AS completed,
        COUNT(*) FILTER (WHERE "deleted" = false) AS count_all,
        COUNT(*) FILTER (WHERE "deleted" = false AND "status" != 'CANCELLED') AS count_non_cancelled
      FROM "Order"
      WHERE "tenantId" = ${tenantId}
        AND "createdAt" >= (NOW() - (${safeDays} * INTERVAL '1 day'))
      GROUP BY 1
      ORDER BY 1 DESC;
    `;

    return rows.map(r => ({
      day: String(r.day),
      gross: Number(r.gross),
      completed: Number(r.completed),
      countAll: Number(r.count_all),
      countNonCancelled: Number(r.count_non_cancelled),
    }));
  }
}
