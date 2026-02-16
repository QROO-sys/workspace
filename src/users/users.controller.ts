import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class UsersController {
  constructor(private users: UsersService) {}

  @Get()
  async list(@Req() req: any) {
    return this.users.list(req.tenantId);
  }

  @Post()
  async create(@Req() req: any, @Body() dto: CreateUserDto) {
    return this.users.create(req.tenantId, dto);
  }

  @Patch(':id/role')
  async updateRole(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateUserRoleDto) {
    return this.users.updateRole(req.tenantId, id, dto);
  }

  @Patch(':id/disable')
  async disable(@Req() req: any, @Param('id') id: string) {
    return this.users.disable(req.tenantId, id);
  }
}
