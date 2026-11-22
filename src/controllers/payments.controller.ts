import type { Request, Response } from "express";
import type Stripe from "stripe";
import { env } from "../config/env";
import { ApiError, asyncHandler } from "../lib/http";
import { getStripe } from "../lib/stripe";
import { Booking } from "../models/Booking";
import { Payment } from "../models/Payment";

const toCents = (amount: number) => Math.round(amount * 100);

const recordPayment = async (session: Stripe.Checkout.Session) => {
  const bookingId = session.metadata?.bookingId;
  const customerEmail = session.metadata?.customerEmail;
  if (!bookingId || !customerEmail || session.payment_status !== "paid") return null;

  const booking = await Booking.findOne({ _id: bookingId, customerEmail });
  if (!booking) return null;

  // Upsert on the unique Stripe session id: webhook + verify can never double-save.
  const payment = await Payment.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        bookingId: booking._id,
        serviceTitle: booking.serviceTitle,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,
        amount: booking.finalAmount,
        currency: "bdt",
        transactionId:
          typeof session.payment_intent === "string"
            ? session.payment_intent
            : (session.payment_intent?.id ?? session.id),
        stripeSessionId: session.id,
        paymentStatus: "paid",
        paidAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  if (booking.paymentStatus !== "paid") {
    booking.paymentStatus = "paid";
    await booking.save();
  }
  return payment;
};

export const createCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOne({
    _id: req.body?.bookingId,
    customerEmail: req.auth?.email.toLowerCase(),
  });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "completed") {
    throw new ApiError(400, "Payment is only available after the job is completed");
  }
  if (booking.paymentStatus === "paid") {
    throw new ApiError(409, "This job has already been paid");
  }

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "bdt",
          unit_amount: toCents(booking.finalAmount),
          product_data: { name: booking.serviceTitle },
        },
      },
    ],
    metadata: { bookingId: booking._id, customerEmail: booking.customerEmail },
    success_url: `${env.stripeSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.stripeCancelUrl,
  });

  res.json({ url: session.url, sessionId: session.id });
});

export const verifyPayment = asyncHandler(async (req: Request, res: Response) => {
  const sessionId =
    typeof req.query.session_id === "string"
      ? req.query.session_id
      : (req.body?.sessionId as string | undefined);
  if (!sessionId) throw new ApiError(400, "session_id is required");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);
  if (session.metadata?.customerEmail !== req.auth?.email.toLowerCase()) {
    throw new ApiError(403, "This payment does not belong to you");
  }

  const payment = await recordPayment(session);
  if (!payment || session.payment_status !== "paid") {
    res.json({ paid: false, status: session.payment_status });
    return;
  }
  res.json({ paid: true, payment });
});

export const stripeWebhook = asyncHandler(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"];
  if (!signature || !env.stripeWebhookSecret) {
    throw new ApiError(400, "Missing Stripe webhook configuration");
  }
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      req.body,
      signature,
      env.stripeWebhookSecret,
    );
  } catch {
    throw new ApiError(400, "Invalid Stripe webhook signature");
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    await recordPayment(event.data.object as Stripe.Checkout.Session);
  }
  res.json({ received: true });
});

export const myPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await Payment.find({ customerEmail: req.auth?.email.toLowerCase() })
    .sort({ paidAt: -1 })
    .lean();
  res.json({ payments });
});

export const allPayments = asyncHandler(async (_req: Request, res: Response) => {
  const payments = await Payment.find().sort({ paidAt: -1 }).lean();
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  res.json({ payments, revenue });
});
