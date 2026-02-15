import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService
  ) {}

  async register(
    email: string,
    password: string,
    name: string,
    role: Role = Role.OWNER,
    tenantId?: string,
    tenantName?: string
  ) {
    if (!email || !password) throw new BadRequestException('Missing email/password');

    const userExists = await this.prisma.user.findUnique({ where: { email } });
    if (userExists) throw new ConflictException('Email already registered');

    // If tenantId is not provided, create a new tenant (SaaS-style signup)
    let tenant = tenantId
      ? await this.prisma.tenant.findFirst({ where: { id: tenantId, deleted: false } })
      : null;

    if (!tenant) {
      const nameGuess = tenantName?.trim() || `${email.split('@')[0]}'s Workspace`;
      tenant = await this.prisma.tenant.create({ data: { name: nameGuess } });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await this.prisma.user.create({
      data: { email, password: hashed, role, name, tenantId: tenant.id }
    });

    return this.issueToken(user);
  }

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid credentials');
    }
    return user;
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    return this.issueToken(user);
  }

  issueToken(user: any) {
    const payload = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    };
    return {
      access_token: this.jwtService.sign(payload)
    };
  }

  async verifyToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
      if (!user) throw new UnauthorizedException();
      return { ...payload, user };
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
