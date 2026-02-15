export class Table {
  id: string;
  name: string;
  qrUrl: string;
  tenant: Tenant;
  tenantId: string;
  orders: Order[];
  tableRequests: TableRequest[];
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}