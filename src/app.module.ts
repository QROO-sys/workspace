import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { TableModule } from './table/table.module';
import { OrderModule } from './order/order.module';
import { PublicModule } from './public/public.module';
import { BookingModule } from './booking/booking.module';
import { TableRequestModule } from './table-request/table-request.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { UsersModule } from './users/users.module';
import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { DbToolsModule } from './db-tools/db-tools.module';

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'changeme',
      signOptions: { expiresIn: '7d' },
    }),
    AuthModule,
    MenuCategoryModule,
    MenuItemModule,
    TableModule,
    OrderModule,
    PublicModule,
    BookingModule,
    TableRequestModule,
    AnalyticsModule,
    UsersModule,
    SmsModule,
    UploadsModule,
    DbToolsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
