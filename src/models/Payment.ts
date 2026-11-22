import mongoose, { type Model } from "mongoose";

const { Schema, model } = mongoose;
const models = mongoose.models;
import { PAYMENT_KINDS, PLANS, type PaymentKind, type Plan } from "../config/constants";

export interface IPayment {
  _id: string;
  bookingId: string;
  serviceTitle: string;
  customerName: string;
  customerEmail: string;
  technicianName: string;
  technicianEmail: string;
  amount: number;
  currency: string;
  transactionId: string;
  stripeSessionId: string;
  kind: PaymentKind;
  plan?: Plan;
  paymentStatus: "paid";
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    // One paid booking can never produce two Payment documents, even when a
    // duplicate Checkout session or a retried webhook arrives.
    bookingId: {
      type: String,
      required: true,
      unique: true,
      partialFilterExpression: { kind: "booking" },
    },
    serviceTitle: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true, lowercase: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "bdt" },
    transactionId: { type: String, required: true },
    stripeSessionId: { type: String, required: true, unique: true },
    kind: { type: String, enum: PAYMENT_KINDS, default: "booking", index: true },
    plan: { type: String, enum: PLANS, default: undefined },
    paymentStatus: { type: String, enum: ["paid"], default: "paid" },
    paidAt: { type: Date, default: Date.now },
  },
  { collection: "payments", timestamps: true, versionKey: false },
);

export const Payment: Model<IPayment> =
  (models.Payment as Model<IPayment>) ?? model<IPayment>("Payment", paymentSchema);
