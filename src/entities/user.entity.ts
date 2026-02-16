export enum Role {
  OWNER = 'OWNER',
  STAFF = 'STAFF',
}
export class User {
  id: string;
  email: string;
  password: string;
  name?: string;
  role: Role;
  tenant: Tenant;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}