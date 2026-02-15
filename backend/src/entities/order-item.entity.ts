export class OrderItem {
  id: string;
  order: Order;
  orderId: string;
  menuItem: MenuItem;
  menuItemId: string;
  quantity: number;
  price: number;
  createdAt: Date;
  updatedAt: Date;
  deleted: boolean;
}