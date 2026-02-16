import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';

describe('AuthService', () => {
  let svc: AuthService;
  let prisma: any;
  let jwt: JwtService;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        create: jest.fn()
      }
    };
    jwt = new JwtService({ secret: 'test' } as any);
    svc = new AuthService(prisma as any, jwt);
  });

  it('register hashes password and issues token', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({ id: 'u1', email: 'x', tenantId: 't1', role: 'OWNER' });
    const res = await svc.register('x@a.com', 'pass123', 'Name', 'OWNER', 't1');
    expect(res.access_token).toBeDefined();
    expect(prisma.user.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ password: expect.any(String) })
    }));
  });

  it('login with valid credentials succeeds', async () => {
    const hashed = await require('bcryptjs').hash('pass123', 10);
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@a.com', password: hashed, tenantId: 't1', role: 'OWNER' });
    const res = await svc.login('x@a.com', 'pass123');
    expect(res.access_token).toBeDefined();
  });

  it('login with wrong password throws', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'x@a.com', password: 'bad', tenantId: 't1', role: 'OWNER' });
    await expect(svc.login('x@a.com', 'wrong')).rejects.toThrow();
  });

  it('registering existing email throws', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
    await expect(
      svc.register('x@a.com', 'pw', 'nm', 'OWNER', 't1')
    ).rejects.toThrow();
  });
});