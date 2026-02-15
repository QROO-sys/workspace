"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenantName = process.env.SEED_TENANT_NAME || 'QROO Workspace';
    const ownerEmail = process.env.SEED_OWNER_EMAIL || 'owner@qroo.local';
    const ownerPass = process.env.SEED_OWNER_PASSWORD || 'ChangeMe123!';
    const managerEmail = process.env.SEED_MANAGER_EMAIL || 'manager@qroo.local';
    const managerPass = process.env.SEED_MANAGER_PASSWORD || 'ChangeMe123!';
    const staffEmail = process.env.SEED_STAFF_EMAIL || 'staff@qroo.local';
    const staffPass = process.env.SEED_STAFF_PASSWORD || 'ChangeMe123!';
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
                role: client_1.Role.OWNER,
                tenantId: tenant.id
            }
        });
    }
    const ensureUser = async (email, pass, role, name) => {
        let u = await prisma.user.findUnique({ where: { email } });
        if (!u) {
            const hashed = await bcrypt.hash(pass, 10);
            u = await prisma.user.create({
                data: { email, password: hashed, name, role, tenantId: tenant.id }
            });
        }
        return u;
    };
    const manager = await ensureUser(managerEmail, managerPass, client_1.Role.MANAGER, 'Manager');
    const staff = await ensureUser(staffEmail, staffPass, client_1.Role.STAFF, 'Staff');
    const existing = await prisma.table.count({ where: { tenantId: tenant.id, deleted: false } });
    if (existing < 10) {
        for (let i = 1; i <= 10; i++) {
            const name = `Desk ${i}`;
            const laptopSerial = `QROO-LAP-${String(i).padStart(3, '0')}`;
            const found = await prisma.table.findFirst({ where: { tenantId: tenant.id, name, deleted: false } });
            if (!found) {
                const table = await prisma.table.create({
                    data: {
                        name,
                        tenantId: tenant.id,
                        laptopSerial,
                        hourlyRate: 100,
                        qrUrl: `${frontendBase}/d/pending`
                    }
                });
                await prisma.table.update({ where: { id: table.id }, data: { qrUrl: `${frontendBase}/d/${table.id}` } });
            }
            else if (!found.laptopSerial) {
                await prisma.table.update({ where: { id: found.id }, data: { laptopSerial } });
            }
        }
    }
    else {
        const desks = await prisma.table.findMany({ where: { tenantId: tenant.id, deleted: false }, orderBy: { createdAt: 'asc' } });
        for (let idx = 0; idx < desks.length; idx++) {
            const d = desks[idx];
            if (!d.laptopSerial) {
                await prisma.table.update({ where: { id: d.id }, data: { laptopSerial: `QROO-LAP-${String(idx + 1).padStart(3, '0')}` } });
            }
        }
    }
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
        }
        else {
            await prisma.menuItem.update({
                where: { id: found.id },
                data: { name: it.name, description: it.description, price: it.price }
            });
        }
    }
    console.log('Seed complete.');
    console.log(`Tenant: ${tenant.id} (${tenant.name})`);
    console.log(`Owner:   ${owner.email} / ${ownerPass}`);
    console.log(`Manager: ${manager.email} / ${managerPass}`);
    console.log(`Staff:   ${staff.email} / ${staffPass}`);
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(async () => { await prisma.$disconnect(); });
//# sourceMappingURL=seed.js.map