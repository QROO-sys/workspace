import { Module } from '@nestjs/common';
import { AppModule as Root } from './app.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { BookingModule } from './booking/booking.module';
import { OrderModule } from './order/order.module';
import { TableModule } from './table/table.module';
import { UsersModule } from './users/users.module';
import { PublicModule } from './public/public.module';
import { UploadsModule } from './uploads/uploads.module';
import { TableRequestModule } from './table-request/table-request.module';
import { SmsModule } from './sms/sms.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { DbToolsModule } from './db-tools/db-tools.module';
import { SessionsModule } from './sessions/sessions.module';

@Module({
  imports: [
    AuthModule,
    UsersModule,
    TableModule,
    MenuCategoryModule,
    MenuItemModule,
    BookingModule,
    OrderModule,
    PublicModule,
    UploadsModule,
    TableRequestModule,
    SmsModule,
    AnalyticsModule,
    DbToolsModule,
    SessionsModule,
  ],
})
export class AppModule {}
