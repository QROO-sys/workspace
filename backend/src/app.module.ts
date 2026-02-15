import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
import { AuthModule } from './auth/auth.module';
import { MenuCategoryModule } from './menu-category/menu-category.module';
import { MenuItemModule } from './menu-item/menu-item.module';
import { TableModule } from './table/table.module';
import { OrderModule } from './order/order.module';
import { PublicModule } from './public/public.module';

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
  ],
  providers: [PrismaService],
})
export class AppModule {}
