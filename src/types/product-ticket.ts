export type ProductTicketStatus = "em_aberto" | "concluido";

export type ProductTicket = {
  id: string;
  /** Nome do funcionário selecionado no momento do registro */
  funcionario?: string;
  ean: string;
  /** JPEG em data URL — foto do código/EAN */
  photoEan: string;
  /** JPEG em data URL — foto do produto */
  photoProduto: string;
  createdAt: string;
  status: ProductTicketStatus;
  /** Login que abriu o ticket (loja / usuário), ex.: leblon, ipanema */
  createdBy?: string;
};
