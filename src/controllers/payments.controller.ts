import type { Request, Response } from "express";
import type { HydratedDocument } from "mongoose";
import type Stripe from "stripe";
import { env } from "../config/env";
import { ApiError, asyncHandler } from "../lib/http";
import { buildInvoicePdf } from "../lib/invoice";
import { getStripe } from "../lib/stripe";
import { Booking, type IBooking } from "../models/Booking";
import { Payment } from "../models/Payment";
import { User } from "../models/User";

const toCents = (amount: number) => Math.round(amount * 100);

/** Stripe metadata only accepts strings, while Mongoose ids are ObjectIds. */
export const checkoutMetadata = (booking: { _id: unknown; customerEmail: unknown }) => ({
  bookingId: String(booking._id),
  customerEmail: String(booking.customerEmail),
  kind: "booking",
});

export const subscriptionMetadata = (user: { _id: unknown; email: string }) => ({
  bookingId: "",
  customerEmail: user.email,
  kind: "pro_subscription",
  userId: String(user._id),
  userEmail: user.email,
  plan: "pro",
});

const transactionIdFrom = (session: Stripe.Checkout.Session) =>
  typeof session.payment_intent === "string"
    ? session.payment_intent
    : (session.payment_intent?.id ?? session.id);

const markBookingPaid = async (booking: HydratedDocument<IBooking>) => {
  if (booking.paymentStatus === "paid" && booking.statusHistory.some((item) => item.status === "paid")) {
    return;
  }
  booking.paymentStatus = "paid";
  if (!booking.statusHistory.some((item) => item.status === "paid")) {
    booking.statusHistory.push({ status: "paid", changedAt: new Date() });
  }
  await booking.save();
};

const recordSubscriptionPayment = async (session: Stripe.Checkout.Session) => {
  const userEmail = session.metadata?.userEmail;
  if (session.payment_status !== "paid" || !userEmail) return null;
  if (session.amount_total !== toCents(env.proMonthlyPriceBdt)) return null;

  const user = await User.findOne({ email: userEmail.toLowerCase() });
  if (!user || user.role !== "technician") return null;

  const payment = await Payment.findOneAndUpdate(
    { stripeSessionId: session.id },
    {
      $setOnInsert: {
        bookingId: "",
        serviceTitle: "FixMate Pro Technician Plan",
        customerName: user.name,
        customerEmail: user.email,
        technicianName: user.name,
        technicianEmail: user.email,
        amount: env.proMonthlyPriceBdt,
        currency: "bdt",
        transactionId: transactionIdFrom(session),
        stripeSessionId: session.id,
        kind: "pro_subscription",
        plan: "pro",
        paymentStatus: "paid",
        paidAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  if (user.plan !== "pro") {
    user.plan = "pro";
    await user.save();
  }
  return payment;
};

const recordPayment = async (session: Stripe.Checkout.Session) => {
  if (session.metadata?.kind === "pro_subscription") {
    return recordSubscriptionPayment(session);
  }

  const bookingId = session.metadata?.bookingId;
  const customerEmail = session.metadata?.customerEmail;
  if (!bookingId || !customerEmail || session.payment_status !== "paid") return null;

  const booking = await Booking.findOne({ _id: bookingId, customerEmail });
  if (!booking) return null;
  // Never trust an amount that does not match the server's final amount.
  if (session.amount_total !== toCents(booking.finalAmount)) return null;

  // A second Checkout session for the same booking must never create a second
  // payment row, even if Stripe delivers both webhooks.
  const existing = await Payment.findOne({ bookingId: booking._id, kind: "booking" });
  if (existing) {
    await markBookingPaid(booking);
    return existing;
  }

  // Upsert on the booking itself, not only the Stripe session id: a duplicate
  // Checkout session can never create a second payment for the same job.
  const payment = await Payment.findOneAndUpdate(
    { bookingId: String(booking._id), kind: "booking" },
    {
      $setOnInsert: {
        bookingId: String(booking._id),
        serviceTitle: booking.serviceTitle,
        customerName: booking.customerName,
        customerEmail: booking.customerEmail,
        technicianName: booking.technicianName,
        technicianEmail: booking.technicianEmail,
        amount: booking.finalAmount,
        currency: "bdt",
        transactionId: transactionIdFrom(session),
        stripeSessionId: session.id,
        kind: "booking",
        paymentStatus: "paid",
        paidAt: new Date(),
      },
    },
    { upsert: true, new: true },
  );

  await markBookingPaid(booking);
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
  const paidPayment = await Payment.findOne({ bookingId: booking._id, kind: "booking" });
  if (booking.paymentStatus === "paid" || paidPayment) {
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
    metadata: checkoutMetadata(booking),
    success_url: `${env.stripeSuccessUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: env.stripeCancelUrl,
  });

  res.json({ url: session.url, sessionId: session.id });
});

/** Optional differentiator: technicians buy Pro through the same Stripe flow. */
export const createProCheckoutSession = asyncHandler(async (req: Request, res: Response) => {
  const user = await User.findOne({ email: req.auth?.email.toLowerCase() });
  if (!user) throw new ApiError(404, "User not found");
  if (user.role !== "technician") throw new ApiError(403, "Only technicians can upgrade to Pro");
  if (user.plan === "pro") throw new ApiError(409, "You are already on the Pro plan");

  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "bdt",
          unit_amount: toCents(env.proMonthlyPriceBdt),
          product_data: { name: "FixMate Pro Technician Plan" },
        },
      },
    ],
    metadata: subscriptionMetadata(user),
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

  if (session.metadata?.kind === "pro_subscription") {
    if (session.metadata?.userEmail !== req.auth?.email.toLowerCase() || req.auth?.role !== "technician") {
      throw new ApiError(403, "This payment does not belong to you");
    }
    const payment = await recordSubscriptionPayment(session);
    if (!payment || session.payment_status !== "paid") {
      res.json({ paid: false, status: session.payment_status });
      return;
    }
    res.json({ paid: true, payment });
    return;
  }

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
  const payments = await Payment.find({ customerEmail: req.auth?.email.toLowerCase(), kind: "booking" })
    .sort({ paidAt: -1 })
    .lean();
  res.json({ payments });
});

export const downloadInvoice = asyncHandler(async (req: Request, res: Response) => {
  const payment = await Payment.findById(req.params.id);
  if (!payment) throw new ApiError(404, "Payment not found");
  const isOwner = payment.customerEmail === req.auth?.email.toLowerCase() || req.auth?.role === "admin";
  if (!isOwner) throw new ApiError(403, "This invoice does not belong to you");

  const pdf = buildInvoicePdf(payment);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="fixmate-invoice-${payment._id}.pdf"`);
  res.send(pdf);
});

export const mySubscriptionPayments = asyncHandler(async (req: Request, res: Response) => {
  const payments = await Payment.find({ technicianEmail: req.auth?.email.toLowerCase(), kind: "pro_subscription" })
    .sort({ paidAt: -1 })
    .lean();
  res.json({ payments });
});

export const allPayments = asyncHandler(async (_req: Request, res: Response) => {
  const payments = await Payment.find().sort({ paidAt: -1 }).lean();
  const revenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
  res.json({ payments, revenue });
});
