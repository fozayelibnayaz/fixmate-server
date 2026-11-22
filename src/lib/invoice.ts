import type { IPayment } from "../models/Payment";

const escapePdfText = (value: string) =>
  value
    .replace(/[^\x20-\x7E]/g, "?")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

/** A tiny dependency-free single-page PDF invoice generator. */
export const buildInvoicePdf = (payment: IPayment): Buffer => {
  const lines: Array<{ y: number; size: number; bold?: boolean; text: string }> = [
    { y: 780, size: 24, bold: true, text: "FixMate" },
    { y: 752, size: 11, text: "Smart Device & Home Appliance Repair Service" },
    { y: 710, size: 16, bold: true, text: "PAYMENT INVOICE" },
    { y: 675, size: 11, bold: true, text: "Payment" },
    { y: 658, size: 11, text: `ID: ${String(payment._id)}` },
    { y: 641, size: 11, text: `Transaction: ${payment.transactionId}` },
    { y: 624, size: 11, text: `Session: ${payment.stripeSessionId}` },
    { y: 607, size: 11, text: `Date: ${new Date(payment.paidAt).toLocaleString("en-GB")}` },
    { y: 570, size: 11, bold: true, text: "Customer" },
    { y: 553, size: 11, text: payment.customerName },
    { y: 536, size: 11, text: payment.customerEmail },
    { y: 499, size: 11, bold: true, text: "Service" },
    { y: 482, size: 11, text: payment.serviceTitle },
    { y: 465, size: 11, text: `Technician: ${payment.technicianName}` },
    { y: 428, size: 11, bold: true, text: "Payment summary" },
    { y: 411, size: 11, text: `Service amount: BDT ${payment.amount.toFixed(2)}` },
    { y: 394, size: 11, text: `Status: ${payment.paymentStatus.toUpperCase()}` },
    { y: 360, size: 14, bold: true, text: `Total paid: BDT ${payment.amount.toFixed(2)}` },
    { y: 310, size: 10, text: "Thank you for choosing FixMate. Pay after the job is done." },
  ];

  const stream = lines
    .map((line) => `BT /${line.bold ? "F2" : "F1"} ${line.size} Tf 60 ${line.y} Td (${escapePdfText(line.text)}) Tj ET`)
    .join("\n");

  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
};
