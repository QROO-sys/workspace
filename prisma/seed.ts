import 'dotenv/config';
import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const tenantName = process.env.SEED_TENANT_NAME || 'QROO Workspace';
  const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@qroo.local';
  const ownerPass  = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';
  const frontendBase = process.env.SEED_FRONTEND_BASE_URL || 'http://localhost:3000';

  let tenant = await prisma.tenant.findFirst({ where: { name: tenantName, deleted: false } });
  if (!tenant) {
    tenant = await prisma.tenant.create({ data: { name: tenantName } });
  }

  let owner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!owner) {
    const hashed = await bcrypt.hash(ownerPass, 10);
    owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        password: hashed,
        name: 'Owner',
        role: Role.OWNER,
        tenantId: tenant.id
      }
    });
  }

  // Seed 10 desks as Tables (with 1 laptop per desk; placeholder serials)
const existing = await prisma.table.count({ where: { tenantId: tenant.id, deleted: false } });
if (existing < 10) {
  // Create only missing ones based on name
  for (let i = 1; i <= 10; i++) {
    const name = `Desk ${i}`;
    const laptopSerial = `QROO-LAP-${String(i).padStart(3, '0')}`; // placeholder
    const found = await prisma.table.findFirst({ where: { tenantId: tenant.id, name, deleted: false } });
    if (!found) {
      const table = await prisma.table.create({
        data: {
          name,
          tenantId: tenant.id,
          laptopSerial,
          qrUrl: `${frontendBase}/d/pending`
        }
      });
      await prisma.table.update({ where: { id: table.id }, data: { qrUrl: `${frontendBase}/d/${table.id}` } });
    } else if (!found.laptopSerial) {
      await prisma.table.update({ where: { id: found.id }, data: { laptopSerial } });
    }
  }
} else {
  // Ensure existing desks have placeholder serials (non-destructive)
  const desks = await prisma.table.findMany({ where: { tenantId: tenant.id, deleted: false }, orderBy: { createdAt: 'asc' } });
  for (let idx = 0; idx < desks.length; idx++) {
    const d = desks[idx];
    if (!d.laptopSerial) {
      await prisma.table.update({ where: { id: d.id }, data: { laptopSerial: `QROO-LAP-${String(idx + 1).padStart(3, '0')}` } });
    }
  }
}

// Seed menu category + items

  let cat = await prisma.menuCategory.findFirst({ where: { tenantId: tenant.id, name: 'Cafe & Time', deleted: false } });
  if (!cat) {
    cat = await prisma.menuCategory.create({ data: { tenantId: tenant.id, name: 'Cafe & Time' } });
  }

  const items = [
  { sku: '002', name: 'Coffee', price: 20, description: 'EGP 20 (free: 1 per paid hour)' },
  { sku: '003', name: 'Tea', price: 20, description: 'EGP 20' },
  { sku: '004', name: 'Pastry', price: 65, description: 'EGP 65' },
  { sku: '001', name: 'Extra hour', price: 100, description: 'Workspace time (EGP 100 per hour)' },
];

for (const it of items) {
  const found = await prisma.menuItem.findFirst({ where: { tenantId: tenant.id, sku: it.sku, deleted: false } });
  if (!found) {
    await prisma.menuItem.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        sku: it.sku,
        name: it.name,
        description: it.description,
        price: it.price
      }
    });
  } else {
    // Keep SKU stable; update name/price/description if they drifted
    await prisma.menuItem.update({
      where: { id: found.id },
      data: { name: it.name, description: it.description, price: it.price }
    });
  }
}

  console.log('Seed complete.');
  console.log(`Tenant: ${tenant.id} (${tenant.name})`);
  console.log(`Owner: ${owner.email} / ${ownerPass}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
