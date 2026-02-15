import { Module } from '@nestjs/common';
import { MenuItemController } from './menu-item.controller';
import { MenuItemService } from './menu-item.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuItemController],
  providers: [MenuItemService, PrismaService],
})
export class MenuItemModule {}
