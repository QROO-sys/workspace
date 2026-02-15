import { MenuCategoryService } from './menu-category.service';

describe('MenuCategoryService', () => {
  let svc: MenuCategoryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      menuCategory: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      }
    };
    svc = new MenuCategoryService(prisma);
  });

  it('creates category for tenant', async () => {
    prisma.menuCategory.create.mockResolvedValue({ id: '1', name: 'Test' });
    const res = await svc.create({ name: 'Test' }, 't1');
    expect(res.name).toBe('Test');
    expect(prisma.menuCategory.create).toHaveBeenCalledWith({ data: { name: 'Test', tenantId: 't1' } });
  });

  // Add similar tests for findAll, update, remove...
});