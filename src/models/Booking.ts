import { Schema, model, type Document } from "mongoose";

export type BookingStatus = "requested" | "accepted" | "rejected" | "in-progress" | "completed" | "cancelled";
export type PaymentStatus = "unpaid" | "paid";

export interface IStatusHistory { status: string; changedAt: Date; }

export interface IBooking extends Document {
  serviceId: string;
  serviceTitle: string;
  serviceImage: string;
  category: string;
  basePrice: number;
  technicianName: string;
  technicianEmail: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: string;
  preferredDate: Date;
  problemDescription: string;
  status: BookingStatus;
  finalAmount: number;
  paymentStatus: PaymentStatus;
  statusHistory: IStatusHistory[];
  rating?: number;
  review?: string;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    serviceId: { type: String, required: true },
    serviceTitle: { type: String, required: true },
    serviceImage: { type: String, default: "" },
    category: { type: String, default: "" },
    basePrice: { type: Number, required: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, index: true },
    customerPhone: { type: String, required: true },
    address: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    problemDescription: { type: String, required: true },
    status: { type: String, enum: ["requested","accepted","rejected","in-progress","completed","cancelled"], default: "requested" },
    finalAmount: { type: Number, default: 0 },
    paymentStatus: { type: String, enum: ["unpaid","paid"], default: "unpaid" },
    statusHistory: { type: [{ status: String, changedAt: Date }], default: [] },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

BookingSchema.index({ customerEmail: 1, serviceId: 1 });
BookingSchema.index({ technicianEmail: 1, status: 1 });

export const Booking = model<IBooking>("Booking", BookingSchema);
