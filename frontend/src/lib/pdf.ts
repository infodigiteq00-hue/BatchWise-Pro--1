import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface StampOptions {
  batchNumber: string;
  approvalDateTime: string; // formatted display string
  approvedByName: string;
  signatureDataUrl?: string;
  printDateTime?: string; // when provided, shown as "Printed on:"
}

export async function stampPdf(originalDataUrl: string, opts: StampOptions): Promise<string> {
  const pdfBytes = dataUrlToBytes(originalDataUrl);
  const pdf = await PDFDocument.load(pdfBytes);
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let sigImage: any = null;
  if (opts.signatureDataUrl) {
    try {
      const sigBytes = dataUrlToBytes(opts.signatureDataUrl);
      if (opts.signatureDataUrl.includes("image/png")) {
        sigImage = await pdf.embedPng(sigBytes);
      } else {
        sigImage = await pdf.embedJpg(sigBytes);
      }
    } catch {
      sigImage = null;
    }
  }

  const pages = pdf.getPages();
  for (const page of pages) {
    const { width, height } = page.getSize();

    // TOP RIGHT — batch + approval timestamp
    const topBoxW = 220;
    const topBoxH = 48;
    const topX = width - topBoxW - 18;
    const topY = height - topBoxH - 18;
    page.drawRectangle({
      x: topX,
      y: topY,
      width: topBoxW,
      height: topBoxH,
      borderColor: rgb(0.1, 0.35, 0.55),
      borderWidth: 1.2,
      color: rgb(0.96, 0.98, 1),
    });
    page.drawText("CONTROLLED DOCUMENT", {
      x: topX + 8,
      y: topY + topBoxH - 13,
      size: 7,
      font: helvBold,
      color: rgb(0.1, 0.35, 0.55),
    });
    page.drawText(`Batch No: ${opts.batchNumber}`, {
      x: topX + 8,
      y: topY + topBoxH - 26,
      size: 9,
      font: helvBold,
      color: rgb(0, 0, 0),
    });
    page.drawText(`Approved: ${opts.approvalDateTime}`, {
      x: topX + 8,
      y: topY + topBoxH - 38,
      size: 8,
      font: helv,
      color: rgb(0.15, 0.15, 0.15),
    });

    // BOTTOM RIGHT — issuance stamp
    const bw = 240;
    const bh = 78;
    const bx = width - bw - 18;
    const by = 18;
    page.drawRectangle({
      x: bx,
      y: by,
      width: bw,
      height: bh,
      borderColor: rgb(0.1, 0.35, 0.55),
      borderWidth: 1.2,
      color: rgb(0.96, 0.98, 1),
    });
    page.drawText("Issued by QA/QC Department", {
      x: bx + 8,
      y: by + bh - 12,
      size: 8,
      font: helvBold,
      color: rgb(0.1, 0.35, 0.55),
    });
    page.drawText(`Approved By: ${opts.approvedByName}`, {
      x: bx + 8,
      y: by + bh - 25,
      size: 8,
      font: helv,
      color: rgb(0, 0, 0),
    });

    if (sigImage) {
      const sigH = 22;
      const sigW = (sigImage.width / sigImage.height) * sigH;
      page.drawImage(sigImage, {
        x: bx + 8,
        y: by + 22,
        width: Math.min(sigW, 110),
        height: sigH,
      });
    } else {
      page.drawText("[ Digital Signature ]", {
        x: bx + 8,
        y: by + 30,
        size: 8,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    page.drawText(`Date & Time: ${opts.approvalDateTime}`, {
      x: bx + 8,
      y: by + 8,
      size: 7,
      font: helv,
      color: rgb(0.15, 0.15, 0.15),
    });

    if (opts.printDateTime) {
      page.drawText(`Printed on: ${opts.printDateTime}`, {
        x: 18,
        y: 12,
        size: 7,
        font: helv,
        color: rgb(0.4, 0.4, 0.4),
      });
    }
  }

  const out = await pdf.save();
  return bytesToDataUrl(out, "application/pdf");
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(",")[1] ?? dataUrl;
  const bin = atob(base64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(bin)}`;
}

// Generate a realistic multi-page demo BMR
export async function generateDemoBmrPdf(productName: string): Promise<string> {
  const pdf = await PDFDocument.create();
  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageW = 595.28;
  const pageH = 841.89;

  const drawHeader = (page: any, title: string, pageNum: number, total: number) => {
    page.drawRectangle({ x: 0, y: pageH - 70, width: pageW, height: 70, color: rgb(0.1, 0.35, 0.55) });
    page.drawText("RP INDUSTRIES", { x: 30, y: pageH - 30, size: 16, font: bold, color: rgb(1, 1, 1) });
    page.drawText("Batch Manufacturing Record", { x: 30, y: pageH - 48, size: 10, font: helv, color: rgb(0.9, 0.95, 1) });
    page.drawText(`Product: ${productName}`, { x: 30, y: pageH - 62, size: 9, font: helv, color: rgb(0.9, 0.95, 1) });
    page.drawText(`Page ${pageNum} of ${total}`, { x: pageW - 90, y: pageH - 62, size: 9, font: helv, color: rgb(0.9, 0.95, 1) });
  };

  const drawSection = (page: any, y: number, title: string, rows: [string, string][]) => {
    page.drawRectangle({ x: 30, y: y - 18, width: pageW - 60, height: 18, color: rgb(0.88, 0.92, 0.96) });
    page.drawText(title, { x: 38, y: y - 13, size: 10, font: bold, color: rgb(0.1, 0.35, 0.55) });
    let cy = y - 22;
    for (const [k, v] of rows) {
      cy -= 18;
      page.drawText(k, { x: 38, y: cy, size: 9, font: bold, color: rgb(0.2, 0.2, 0.2) });
      page.drawLine({ start: { x: 200, y: cy - 3 }, end: { x: pageW - 40, y: cy - 3 }, thickness: 0.5, color: rgb(0.6, 0.6, 0.6) });
      page.drawText(v, { x: 205, y: cy, size: 9, font: helv, color: rgb(0.1, 0.1, 0.1) });
    }
    return cy - 14;
  };

  const drawTable = (page: any, y: number, title: string, headers: string[], rows: number) => {
    page.drawRectangle({ x: 30, y: y - 18, width: pageW - 60, height: 18, color: rgb(0.88, 0.92, 0.96) });
    page.drawText(title, { x: 38, y: y - 13, size: 10, font: bold, color: rgb(0.1, 0.35, 0.55) });
    const colW = (pageW - 60) / headers.length;
    let cy = y - 22;
    cy -= 16;
    headers.forEach((h, i) => {
      page.drawRectangle({ x: 30 + i * colW, y: cy - 2, width: colW, height: 16, borderColor: rgb(0.5, 0.5, 0.5), borderWidth: 0.5, color: rgb(0.96, 0.97, 0.99) });
      page.drawText(h, { x: 34 + i * colW, y: cy + 3, size: 8, font: bold, color: rgb(0.1, 0.1, 0.1) });
    });
    for (let r = 0; r < rows; r++) {
      cy -= 18;
      headers.forEach((_, i) => {
        page.drawRectangle({ x: 30 + i * colW, y: cy - 2, width: colW, height: 18, borderColor: rgb(0.7, 0.7, 0.7), borderWidth: 0.4 });
      });
    }
    return cy - 14;
  };

  // Page 1 — Cover
  const p1 = pdf.addPage([pageW, pageH]);
  drawHeader(p1, productName, 1, 4);
  let y = pageH - 100;
  y = drawSection(p1, y, "1. Product Information", [
    ["Product Name", productName],
    ["Generic Name", "—"],
    ["Dosage Form", "Tablet / Capsule"],
    ["Strength", "—"],
    ["Pack Size", "—"],
  ]);
  y = drawSection(p1, y, "2. Batch Information", [
    ["Batch Number", "[ to be filled ]"],
    ["Batch Size", "[ to be filled ]"],
    ["Mfg. Date", "_____________"],
    ["Expiry Date", "_____________"],
    ["Manufacturing Department", "Production"],
  ]);
  y = drawSection(p1, y, "3. Document Control", [
    ["BMR No.", "BMR/" + productName.slice(0, 3).toUpperCase() + "/001"],
    ["Version", "01"],
    ["Effective Date", new Date().toLocaleDateString()],
    ["Issued By", "QA/QC Department"],
  ]);

  // Page 2 — Raw materials
  const p2 = pdf.addPage([pageW, pageH]);
  drawHeader(p2, productName, 2, 4);
  y = pageH - 100;
  y = drawTable(p2, y, "4. Raw Material Dispensing Record", ["S.No", "Material", "AR No.", "Std Qty", "Actual Qty", "Sign"], 8);
  y = drawTable(p2, y, "5. Equipment Used", ["S.No", "Equipment ID", "Name", "Cleaned (Y/N)", "Verified By"], 5);

  // Page 3 — Process
  const p3 = pdf.addPage([pageW, pageH]);
  drawHeader(p3, productName, 3, 4);
  y = pageH - 100;
  y = drawTable(p3, y, "6. Manufacturing Process Steps", ["Step", "Operation", "Parameter", "Observation", "Done By", "Checked By"], 10);
  y = drawTable(p3, y, "7. In-Process Quality Checks", ["Time", "Test", "Specification", "Result", "Analyst"], 6);

  // Page 4 — Sign-off
  const p4 = pdf.addPage([pageW, pageH]);
  drawHeader(p4, productName, 4, 4);
  y = pageH - 100;
  y = drawTable(p4, y, "8. Yield Reconciliation", ["Stage", "Theoretical", "Actual", "% Yield", "Remarks"], 5);
  y -= 8;
  y = drawSection(p4, y, "9. Final Review & Release", [
    ["Manufactured By (Production)", "_____________________"],
    ["Reviewed By (Production Head)", "_____________________"],
    ["Reviewed By (QA)", "_____________________"],
    ["Approved By (QA Head)", "_____________________"],
    ["Release Date", "_____________________"],
  ]);

  const out = await pdf.save();
  return bytesToDataUrl(out, "application/pdf");
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

/** Blob URL for embedding or preview (caller should revoke when done). */
export function pdfDataUrlToBlobUrl(dataUrl: string): string | null {
  if (!dataUrl?.startsWith("data:")) return null;
  try {
    const bytes = dataUrlToBytes(dataUrl);
    const blob = new Blob([bytes], { type: "application/pdf" });
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

/**
 * Open PDF preview in a new tab. Data URLs are blocked by many browsers in <a target="_blank">.
 */
export function openPdfDataUrlPreview(dataUrl: string): boolean {
  const url = pdfDataUrlToBlobUrl(dataUrl);
  if (!url) return false;
  const win = window.open(url, "_blank", "noopener,noreferrer");
  if (!win) {
    URL.revokeObjectURL(url);
    return false;
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000);
  return true;
}
