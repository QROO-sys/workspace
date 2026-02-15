export class Tenant {
  id: string;
  name: string;
  users: User[];
  tables: Table[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  orders: Order[];
  tableRequests: TableRequest[];
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}