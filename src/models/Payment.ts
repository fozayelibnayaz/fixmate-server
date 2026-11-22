import { Schema, model, type Model } from "mongoose";

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
  paymentStatus: "paid";
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const paymentSchema = new Schema<IPayment>(
  {
    bookingId: { type: String, required: true, index: true },
    serviceTitle: { type: String, required: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true, lowercase: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "bdt" },
    transactionId: { type: String, required: true },
    stripeSessionId: { type: String, required: true, unique: true },
    paymentStatus: { type: String, enum: ["paid"], default: "paid" },
    paidAt: { type: Date, default: Date.now },
  },
  { collection: "payments", timestamps: true, versionKey: false },
);

export const Payment: Model<IPayment> = model<IPayment>("Payment", paymentSchema);
