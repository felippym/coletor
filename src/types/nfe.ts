export interface NFeProduct {
  ean: string;
  description: string;
  expectedQty: number;
  unitPrice: number;
  countedQty: number;
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
