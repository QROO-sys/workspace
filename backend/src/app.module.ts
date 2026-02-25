import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';

import { BookingModule } from './booking/booking.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { OrderModule } from './order/order.module';
import { TableModule } from './table/table.module';
import { UsersModule } from './users/users.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { DbToolsModule } from './db-tools/db-tools.module';
import { SessionsModule } from './sessions/sessions.module';
import { PublicModule } from './public/public.module';

import { SmsModule } from './sms/sms.module';
import { UploadsModule } from './uploads/uploads.module';
import { TableRequestModule } from './table-request/table-request.module';

@Module({
  imports: [
    AuthModule,
    PublicModule,

    UsersModule,
    TableModule,

    MenuCategoryModule,
    MenuItemModule,

    BookingModule,
    SessionsModule,

    OrderModule,
    AnalyticsModule,

    DbToolsModule,

    SmsModule,
    UploadsModule,
    TableRequestModule,
  ],
})
export class AppModule {}
