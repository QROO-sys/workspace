import { Module } from '@nestjs/common';
import { MenuCategoryController } from './menu-category.controller';
import { MenuCategoryService } from './menu-category.service';
import { PrismaService } from '../prisma.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [MenuCategoryController],
  providers: [MenuCategoryService, PrismaService],
})
export class MenuCategoryModule {}
