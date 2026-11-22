import { describe, expect, it } from "vitest";
import { buildInvoicePdf } from "./invoice";

describe("buildInvoicePdf", () => {
  it("builds a valid single-page PDF with payment details", () => {
    const pdf = buildInvoicePdf({
      _id: "pay-1",
      bookingId: "booking-1",
      serviceTitle: "Phone Repair",
      customerName: "Nadia (Test)",
      customerEmail: "customer@fixmate.test",
      technicianName: "Rahim",
      technicianEmail: "technician@fixmate.test",
      amount: 3500,
      currency: "bdt",
      transactionId: "pi_123",
      stripeSessionId: "cs_123",
      kind: "booking",
      paymentStatus: "paid",
      paidAt: new Date("2026-11-22T10:00:00.000Z"),
      createdAt: new Date("2026-11-22T10:00:00.000Z"),
      updatedAt: new Date("2026-11-22T10:00:00.000Z"),
    });

    const text = pdf.toString("latin1");
    expect(text.startsWith("%PDF-1.4")).toBe(true);
    expect(text).toContain("PAYMENT INVOICE");
    expect(text).toContain("Nadia \\(Test\\)");
    expect(text).toContain("BDT 3500.00");
    expect(text.trimEnd().endsWith("%%EOF")).toBe(true);
  });
});
