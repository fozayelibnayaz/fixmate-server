import { Schema, model, type Document } from "mongoose";

export interface IPayment extends Document {
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
  paymentStatus: "paid";
  paidAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: String, required: true, unique: true },
    serviceTitle: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, index: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    transactionId: { type: String, required: true },
    stripeSessionId: { type: String, required: true, unique: true },
    paymentStatus: { type: String, default: "paid" },
    paidAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Payment = model<IPayment>("Payment", PaymentSchema);
