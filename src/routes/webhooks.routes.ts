import { Router } from "express";
import Stripe from "stripe";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { env } from "../config/env.js";

const router = Router();
const stripe = new Stripe(env.stripeSecretKey || "sk_test_placeholder", { apiVersion: "2024-12-18.acacia" as any });

router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"] as string;
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.stripeWebhookSecret || "");
  } catch (err) {
    console.error("webhook sig verify failed", err);
    return res.status(400).send("Bad signature");
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const bookingId = session.metadata?.bookingId;
    if (bookingId) {
      const existing = await Payment.findOne({ stripeSessionId: session.id });
      if (!existing) {
        const b = await Booking.findById(bookingId);
        if (b) {
          await Payment.create({
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
        }
      }
    }
  }
  res.json({ received: true });
});

export default router;
