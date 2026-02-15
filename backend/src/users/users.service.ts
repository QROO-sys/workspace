import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async list(tenantId: string) {
    return this.prisma.user.findMany({
      where: { tenantId, deleted: false },
      orderBy: { createdAt: 'asc' },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async create(tenantId: string, dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already exists');

    const hashed = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        tenantId,
        email: dto.email,
        password: hashed,
        name: dto.name,
        role: dto.role,
      },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
    return user;
  }

  async updateRole(tenantId: string, userId: string, dto: UpdateUserRoleDto) {
    const existing = await this.prisma.user.findFirst({ where: { id: userId, tenantId, deleted: false } });
    if (!existing) throw new NotFoundException('User not found');
    return this.prisma.user.update({
      where: { id: userId },
      data: { role: dto.role },
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async disable(tenantId: string, userId: string) {
    const existing = await this.prisma.user.findFirst({ where: { id: userId, tenantId, deleted: false } });
    if (!existing) throw new NotFoundException('User not found');
    await this.prisma.user.update({ where: { id: userId }, data: { deleted: true } });
    return { ok: true };
  }
}
