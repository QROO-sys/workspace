import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

// Usage: @Roles(Role.OWNER, Role.MANAGER)
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
