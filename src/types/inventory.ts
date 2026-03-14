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
  /** ID da loja à qual o inventário pertence */
  lojaId?: string | null;
  /** ID do usuário que criou o inventário */
  usuarioId?: string | null;
  /** Fallback: username da loja para localStorage quando não há Supabase */
  lojaUsername?: string | null;
}
