export enum RequestType {
  CALL_STAFF = 'CALL_STAFF',
  WATER = 'WATER',
  BILL = 'BILL',
  OTHER = 'OTHER',
}
export class TableRequest {
  id: string;
  table: Table;
  tableId: string;
  tenant: Tenant;
  tenantId: string;
  requestType: RequestType;
  message?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}