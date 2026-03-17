import { jsPDF } from "jspdf";
import type { NFeConference } from "@/types/nfe";
import { COMPANY_CONFIG } from "./company-config";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function generateConferencePdf(conference: NFeConference): void {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const addLine = (text: string, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", isBold ? "bold" : "normal");
    doc.text(text, 15, y);
    y += fontSize * 0.5 + 2;
  };

  const addSpacing = (mm = 5) => {
    y += mm;
  };

  // Título
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de Conferência NFe", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Empresa (destinatária)
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Empresa (Destinatária)", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  addLine(conference.destRazaoSocial || COMPANY_CONFIG.razaoSocial);
  addLine(`CNPJ: ${conference.destCnpj || COMPANY_CONFIG.cnpj || "—"}`);
  if (COMPANY_CONFIG.endereco) addLine(COMPANY_CONFIG.endereco);
  addSpacing(8);

  // Empresa emissora
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Empresa Emissora da NFe", 15, y);
  y += 7;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  addLine(conference.supplierName);
  addLine(`CNPJ: ${conference.supplierCnpj || "—"}`);
  addLine(`NFe nº ${conference.invoiceNumber}`);
  addLine(`Data de emissão: ${formatDate(conference.issueDate)}`);
  addLine(`Data da conferência: ${formatDate(conference.createdAt)}`);
  if (conference.startedBy) addLine(`Conferido por: ${conference.startedBy}`);
  addSpacing(8);

  // Observação
  if (conference.observation) {
    doc.setFont("helvetica", "bold");
    doc.text("Observação:", 15, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    const obsLines = doc.splitTextToSize(conference.observation, pageWidth - 30);
    doc.text(obsLines, 15, y);
    y += obsLines.length * 6 + 8;
  }

  // Divergências
  const divergences = conference.products.filter((p) => p.countedQty !== p.expectedQty);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(
    divergences.length > 0
      ? `Divergências (${divergences.length} produto(s))`
      : "Divergências: Nenhuma",
    15,
    y
  );
  y += 8;

  if (divergences.length > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);

    divergences.forEach((p) => {
      const diff = p.countedQty - p.expectedQty;
      const status = diff > 0 ? "Sobrando" : "Faltando";

      if (y > 265) {
        doc.addPage();
        y = 15;
      }

      doc.setFont("helvetica", "bold");
      const descLines = doc.splitTextToSize(p.description, pageWidth - 30);
      doc.text(descLines, 15, y);
      y += descLines.length * 5 + 2;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(`EAN: ${p.ean}`, 15, y);
      y += 5;

      doc.setFontSize(9);
      doc.text(
        `Esperado: ${p.expectedQty} | Conferido: ${p.countedQty} | Diferença: ${diff > 0 ? `+${diff}` : diff} (${status})`,
        15,
        y
      );
      y += 8;
    });
  } else {
    doc.setFont("helvetica", "normal");
    doc.text("Todos os itens foram conferidos corretamente.", 15, y);
  }

  const fileName = `conferencia-nfe-${conference.invoiceNumber}-${formatDate(conference.createdAt).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
