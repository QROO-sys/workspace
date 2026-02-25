import { Body, Controller, Get, Param, Patch, Req, UseGuards, ForbiddenException, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

const ALLOWED = new Set(['OWNER', 'ADMIN', 'EMPLOYEE', 'RENTER', 'CUSTOMER']);

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

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Req() req: any) {
    assertOwnerOrAdmin(req);
    return this.users.listUsers(req);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async update(@Req() req: any, @Param('id') id: string, @Body() dto: any) {
    assertOwner(req);

    let role = String(dto?.role || '').toUpperCase();
    if (!ALLOWED.has(role)) {
      throw new BadRequestException(`Invalid role. Allowed: OWNER, ADMIN, EMPLOYEE, CUSTOMER`);
    }

    // Store CUSTOMER as RENTER to avoid Prisma enum changes
    if (role === 'CUSTOMER') role = 'RENTER';

    return this.users.updateUserRole(req, id, role);
  }
}
