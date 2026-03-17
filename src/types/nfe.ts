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

export interface NFeConference extends NFeInvoice {
  id: string;
  createdAt: string;
  observation?: string;
  startedBy?: string;
}
