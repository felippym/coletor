/** Descrição usada para linhas adicionadas manualmente (código fora da NFe). */
export const NFE_PRODUCT_NOT_ON_INVOICE = "Produto não listado na NFe" as const;

export interface NFeProduct {
  ean: string;
  description: string;
  expectedQty: number;
  unitPrice: number;
  countedQty: number;
  /** Códigos escaneados vinculados a esta linha (contam no conferido da NFe). */
  linkedScanCodes?: string[];
  /** Unidades conferidas por cada código vinculado (para remover vínculo sem distorcer o total). */
  linkedScanCounts?: Record<string, number>;
}

export interface NFeInvoice {
  key: string;
  invoiceNumber: string;
  supplierName: string;
  supplierCnpj?: string;
  issueDate: string;
  products: NFeProduct[];
  /** Destinatário (nossa empresa) - extraído do XML */
  destRazaoSocial?: string;
  destCnpj?: string;
}

export type NFeConferenceStatus = "em_andamento" | "em_analise" | "concluida" | "encerrado";

export interface NFeConference extends NFeInvoice {
  id: string;
  createdAt: string;
  observation?: string;
  startedBy?: string;
  /** Status definido manualmente pelo admin (sobrescreve o calculado) */
  status?: NFeConferenceStatus;
  /** Usuário que criou/importou (ipanema, leblon, admin) - visível apenas para criador + admin */
  createdBy?: string;
}
