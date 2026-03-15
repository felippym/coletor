export interface InventoryItem {
  ean: string;
  quantity: number;
}

export type InventoryStatus = "em_contagem" | "finalizado" | "importado";

export interface Inventory {
  id: string;
  name: string;
  createdAt: string;
  items: InventoryItem[];
  status: InventoryStatus;
  observation?: string;
}
