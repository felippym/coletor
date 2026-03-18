import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { NFeConference } from "@/types/nfe";
import { COMPANY_CONFIG } from "./company-config";

// Cores (RGB 0-255)
const COLORS = {
  primary: [0, 0, 0] as [number, number, number],
  primaryLight: [243, 244, 246] as [number, number, number],
  success: [22, 163, 74] as [number, number, number],
  successLight: [220, 252, 231] as [number, number, number],
  warning: [234, 179, 8] as [number, number, number],
  warningLight: [254, 249, 195] as [number, number, number],
  error: [220, 38, 38] as [number, number, number],
  errorLight: [254, 226, 226] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

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

async function loadLogoBase64(): Promise<string | null> {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const res = await fetch(`${base}/logo.png`);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateConferencePdf(conference: NFeConference): Promise<void> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;

  // --- Logo e Título ---
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(...COLORS.white);

  const logoBase64 = await loadLogoBase64();
  if (logoBase64) {
    const logoW = 45;
    const logoH = 24;
    doc.addImage(logoBase64, "PNG", margin, 4, logoW, logoH);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Conferência NFe", margin + logoW + 10, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`NFe nº ${conference.invoiceNumber} • ${conference.supplierName}`, margin + logoW + 10, 20);
  } else {
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("Relatório de Conferência NFe", pageWidth / 2, 14, { align: "center" });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`NFe nº ${conference.invoiceNumber} • ${conference.supplierName}`, pageWidth / 2, 20, {
      align: "center",
    });
  }

  doc.setTextColor(0, 0, 0);
  y = 42;

  // --- Empresa Destinatária (tabela compacta) ---
  autoTable(doc, {
    startY: y,
    head: [["Empresa (Destinatária)"]],
    body: [
      [conference.destRazaoSocial || COMPANY_CONFIG.razaoSocial],
      [`CNPJ: ${conference.destCnpj || COMPANY_CONFIG.cnpj || "—"}`],
      ...(COMPANY_CONFIG.endereco ? [[COMPANY_CONFIG.endereco]] : []),
    ],
    theme: "plain",
    headStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primary,
      fontStyle: "bold",
      fontSize: 11,
    },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
    tableWidth: "auto",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // --- Empresa Emissora ---
  const supplierBody = [
    [conference.supplierName],
    [`CNPJ: ${conference.supplierCnpj || "—"}`],
    [`NFe nº ${conference.invoiceNumber}`],
    [`Data emissão: ${formatDate(conference.issueDate)}`],
    [`Data conferência: ${formatDate(conference.createdAt)}`],
    ...(conference.startedBy ? [[`Conferido por: ${conference.startedBy}`]] : []),
  ];
  autoTable(doc, {
    startY: y,
    head: [["Empresa Emissora da NFe"]],
    body: supplierBody,
    theme: "plain",
    headStyles: {
      fillColor: COLORS.primaryLight,
      textColor: COLORS.primary,
      fontStyle: "bold",
      fontSize: 11,
    },
    bodyStyles: { fontSize: 10 },
    margin: { left: margin, right: margin },
    tableWidth: "auto",
  });
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;

  // --- Observação ---
  if (conference.observation) {
    autoTable(doc, {
      startY: y,
      head: [["Observação"]],
      body: [[conference.observation]],
      theme: "plain",
      headStyles: {
        fillColor: COLORS.primaryLight,
        textColor: COLORS.primary,
        fontStyle: "bold",
        fontSize: 11,
      },
      bodyStyles: { fontSize: 10 },
      margin: { left: margin, right: margin },
      tableWidth: "auto",
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  // --- Divergências ---
  const divergences = conference.products.filter((p) => p.countedQty !== p.expectedQty);

  if (divergences.length > 0) {
    const head = [["Descrição", "EAN", "Esperado", "Conferido", "Diferença", "Status"]];
    const body = divergences.map((p) => {
      const diff = p.countedQty - p.expectedQty;
      const status = diff > 0 ? "Sobrando" : "Faltando";
      return [
        p.description,
        p.ean,
        String(p.expectedQty),
        String(p.countedQty),
        diff > 0 ? `+${diff}` : String(diff),
        status,
      ];
    });

    autoTable(doc, {
      startY: y,
      head,
      body,
      theme: "striped",
      headStyles: {
        fillColor: COLORS.primary,
        textColor: COLORS.white,
        fontStyle: "bold",
        fontSize: 10,
        halign: "center",
      },
      columnStyles: {
        0: { cellWidth: "auto", minCellWidth: 50 },
        1: { cellWidth: 28, halign: "center" },
        2: { cellWidth: 22, halign: "center" },
        3: { cellWidth: 22, halign: "center" },
        4: { cellWidth: 22, halign: "center" },
        5: { cellWidth: 28, halign: "center" },
      },
      bodyStyles: { fontSize: 9 },
      didParseCell: (data) => {
        if (data.section === "body") {
          const row = data.row.index;
          const p = divergences[row];
          const diff = p.countedQty - p.expectedQty;
          if (diff > 0) {
            data.cell.styles.fillColor = COLORS.warningLight;
            if (data.column.index === 5) data.cell.styles.textColor = [161, 98, 7];
          } else {
            data.cell.styles.fillColor = COLORS.errorLight;
            if (data.column.index === 5) data.cell.styles.textColor = COLORS.error;
          }
        }
      },
      margin: { left: margin, right: margin },
      tableLineColor: COLORS.border,
      tableLineWidth: 0.2,
    });
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  } else {
    doc.setFillColor(...COLORS.successLight);
    doc.rect(margin, y, pageWidth - margin * 2, 14, "F");
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COLORS.success);
    doc.text("✓ Todos os itens foram conferidos corretamente.", pageWidth / 2, y + 9, {
      align: "center",
    });
    doc.setTextColor(0, 0, 0);
    y += 24;
  }

  // Verificar quebra de página para resumo (se houver muitas divergências)
  if (y > 250 && divergences.length > 0) {
    doc.addPage();
    y = 15;
  }

  // --- Resumo ---
  const totalEsperado = conference.products
    .filter((p) => p.expectedQty > 0)
    .reduce((s, p) => s + p.expectedQty, 0);
  const totalConferido = conference.products.reduce((s, p) => s + p.countedQty, 0);
  const okCount = conference.products.filter((p) => p.countedQty === p.expectedQty).length;

  autoTable(doc, {
    startY: y,
    body: [
      ["Total de produtos", String(conference.products.length)],
      ["Itens esperados", String(totalEsperado)],
      ["Itens conferidos", String(totalConferido)],
      ["Produtos sem divergência", String(okCount)],
      ["Divergências", String(divergences.length)],
    ],
    theme: "plain",
    bodyStyles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "bold" },
      1: { cellWidth: 40, halign: "right" },
    },
    margin: { left: margin, right: margin },
    tableWidth: 120,
    tableLineColor: COLORS.border,
  });

  const fileName = `conferencia-nfe-${conference.invoiceNumber}-${formatDate(conference.createdAt).replace(/\//g, "-")}.pdf`;
  doc.save(fileName);
}
