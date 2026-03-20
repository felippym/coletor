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
  /** Usuário que criou (ipanema, leblon, admin) - visível apenas para criador + admin */
  createdBy?: string;
  /** Funcionário que está realizando a contagem (cadastro em Usuários) */
  funcionario?: string;
}
