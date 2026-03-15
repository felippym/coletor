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
  issueDate: string;
  products: NFeProduct[];
}

export interface NFeConference extends NFeInvoice {
  id: string;
  createdAt: string;
}
