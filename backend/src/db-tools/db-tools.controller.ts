import { BadRequestException, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OwnerGuard } from '../auth/owner.guard';

const execFileAsync = promisify(execFile);

@Controller('db-tools')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class DbToolsController {
  private ensureEnabled() {
    const enabled = (process.env.ENABLE_DB_TOOLS || '').toLowerCase() === 'true';
    if (!enabled) {
      throw new BadRequestException('DB tools are disabled. Set ENABLE_DB_TOOLS=true in backend .env');
    }
  }

  @Post('push')
  async pushSchema(@Req() _req: any) {
    this.ensureEnabled();
    const { stdout, stderr } = await execFileAsync('npx', ['prisma', 'db', 'push', '--schema', 'prisma/schema.prisma'], {
      cwd: process.cwd(),
      env: process.env,
    });
    return { ok: true, stdout, stderr };
  }

  @Post('seed')
  async seed(@Req() _req: any) {
    this.ensureEnabled();
    const { stdout, stderr } = await execFileAsync('npm', ['run', 'seed'], {
      cwd: process.cwd(),
      env: process.env,
    });
    return { ok: true, stdout, stderr };
  }

  @Post('reset')
  async resetDb(@Req() _req: any) {
    this.ensureEnabled();
    // Destructive: resets schema & data.
    const { stdout, stderr } = await execFileAsync(
      'npx',
      ['prisma', 'migrate', 'reset', '--schema', 'prisma/schema.prisma', '--force', '--skip-seed'],
      { cwd: process.cwd(), env: process.env },
    );
    return { ok: true, stdout, stderr };
  }
}
