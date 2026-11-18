import { Router } from "express";
import { z } from "zod";
import Stripe from "stripe";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { verifyToken, verifyCustomer } from "../middleware/verifyToken.js";
import { HttpError } from "../middleware/errorHandler.js";
import { env } from "../config/env.js";

const router = Router();
const stripe = new Stripe(env.stripeSecretKey || "sk_test_placeholder", { apiVersion: "2024-12-18.acacia" as any });

router.post("/create-checkout-session", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const { bookingId } = z.object({ bookingId: z.string() }).parse(req.body);
    const b = await Booking.findById(bookingId);
    if (!b) throw new HttpError(404, "Booking not found");
    if (b.customerEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    if (b.status !== "completed") throw new HttpError(400, "Job must be completed before payment");
    if (b.paymentStatus === "paid") throw new HttpError(400, "Already paid");

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: b.serviceTitle },
            unit_amount: Math.round(b.finalAmount * 100),
          },
          quantity: 1,
        },
      ],
      success_url: `${env.clientUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/payment/cancel`,
      metadata: { bookingId: b._id.toString(), customerEmail: b.customerEmail },
      customer_email: b.customerEmail,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (e) { next(e); }
});

router.get("/verify", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const sessionId = String(req.query.session_id ?? "");
    if (!sessionId) throw new HttpError(400, "session_id required");
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      return res.json({ paid: false });
    }
    const bookingId = session.metadata?.bookingId;
    if (!bookingId) throw new HttpError(400, "missing booking metadata");

    // idempotency
    const existing = await Payment.findOne({ stripeSessionId: session.id });
    if (existing) {
      const b = await Booking.findById(bookingId);
      return res.json({ paid: true, payment: existing, booking: b });
    }

    const b = await Booking.findById(bookingId);
    if (!b) throw new HttpError(404, "Booking not found");
    if (b.customerEmail !== req.user!.email) throw new HttpError(403, "Forbidden");

    const payment = await Payment.create({
      bookingId: b._id.toString(),
      serviceTitle: b.serviceTitle,
      customerName: b.customerName,
      customerEmail: b.customerEmail,
      technicianName: b.technicianName,
      technicianEmail: b.technicianEmail,
      amount: b.finalAmount,
      currency: "usd",
      transactionId: String(session.payment_intent ?? session.id),
      stripeSessionId: session.id,
      paymentStatus: "paid",
      paidAt: new Date(),
    });
    b.paymentStatus = "paid";
    b.statusHistory.push({ status: "paid", changedAt: new Date() });
    await b.save();
    res.json({ paid: true, payment, booking: b });
  } catch (e) { next(e); }
});



// Invoice PDF
router.get("/invoice/:bookingId", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const b = await (await import("../models/Booking.js")).Booking.findById(req.params.bookingId);
    if (!b) throw new (await import("../middleware/errorHandler.js")).HttpError(404, "Booking not found");
    if (b.customerEmail !== req.user!.email) throw new (await import("../middleware/errorHandler.js")).HttpError(403, "Forbidden");
    const pay = await (await import("../models/Payment.js")).Payment.findOne({ bookingId: b._id.toString() });
    const PDFDocument = (await import("pdfkit")).default;
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${b._id}.pdf`);
    doc.pipe(res);
    doc.fontSize(22).fillColor("#00e0c6").text("FixMate", 50, 50);
    doc.fontSize(10).fillColor("#888").text("Repair Service Invoice", 50, 78);
    doc.moveDown();
    doc.fillColor("#000").fontSize(12);
    doc.text(`Booking ID: ${b._id}`);
    doc.text(`Service: ${b.serviceTitle}`);
    doc.text(`Customer: ${b.customerName} (${b.customerEmail})`);
    doc.text(`Technician: ${b.technicianName} (${b.technicianEmail})`);
    doc.text(`Date: ${new Date(b.preferredDate).toLocaleDateString()}`);
    doc.text(`Status: ${b.status} / ${b.paymentStatus}`);
    doc.moveDown();
    doc.fontSize(14).text(`Amount: $${b.finalAmount}`, { bold: true } as any);
    if (pay) {
      doc.text(`Transaction ID: ${pay.transactionId}`);
      doc.text(`Paid at: ${new Date(pay.paidAt).toLocaleString()}`);
    }
    doc.end();
  } catch (e) { next(e); }
});

// customer payments list
router.get("/my", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const pays = await (await import("../models/Payment.js")).Payment.find({ customerEmail: req.user!.email }).sort({ paidAt: -1 }).lean();
    res.json({ data: pays });
  } catch (e) { next(e); }
});

export default router;
