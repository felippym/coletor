export interface InventoryItem {
  ean: string;
  quantity: number;
}

export interface Inventory {
  id: string;
  name: string;
  createdAt: string;
  items: InventoryItem[];
}
