import { Body, Controller, Get, Param, Patch, Req, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

const ALLOWED_ROLES = new Set(['OWNER', 'ADMIN', 'EMPLOYEE', 'RENTER']);

function reqRole(req: any): string {
  return String(req?.user?.role || '').toUpperCase();
}

function assertOwner(req: any) {
  if (reqRole(req) !== 'OWNER') throw new ForbiddenException('Owner only');
}

function assertOwnerOrAdmin(req: any) {
  const r = reqRole(req);
  if (r !== 'OWNER' && r !== 'ADMIN') throw new ForbiddenException('Owner/Admin only');
}

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  // Owner/Admin can list users
  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any) {
    assertOwnerOrAdmin(req);
    return this.users.listUsers(req);
  }

  // Owner can change roles
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    assertOwner(req);

    const role = String(dto?.role || '').toUpperCase();
    if (!ALLOWED_ROLES.has(role)) {
      throw new BadRequestException(`Invalid role. Allowed: ${Array.from(ALLOWED_ROLES).join(', ')}`);
    }

    return this.users.updateUserRole(req, id, role);
  }
}
