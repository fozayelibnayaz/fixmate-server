import mongoose, { type Model } from "mongoose";

const { Schema, model } = mongoose;
const models = mongoose.models;
import {
  BOOKING_STATUSES,
  PAYMENT_STATUSES,
  type BookingStatus,
  type PaymentStatus,
} from "../config/constants";

export interface IBooking {
  _id: string;
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
  statusHistory: Array<{ status: string; changedAt: Date }>;
  rating?: number;
  review?: string;
  createdAt: Date;
  updatedAt: Date;
}

const statusHistorySchema = new Schema(
  {
    status: { type: String, required: true },
    changedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const bookingSchema = new Schema<IBooking>(
  {
    serviceId: { type: String, required: true, index: true },
    serviceTitle: { type: String, required: true },
    serviceImage: { type: String, default: "" },
    category: { type: String, default: "" },
    basePrice: { type: Number, required: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true, lowercase: true, index: true },
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true, lowercase: true, index: true },
    customerPhone: { type: String, required: true },
    address: { type: String, required: true },
    preferredDate: { type: Date, required: true },
    problemDescription: { type: String, required: true },
    status: { type: String, enum: BOOKING_STATUSES, default: "requested", index: true },
    finalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "unpaid" },
    statusHistory: {
      type: [statusHistorySchema],
      default: () => [{ status: "requested", changedAt: new Date() }],
    },
    rating: { type: Number, min: 1, max: 5 },
    review: { type: String, default: "" },
  },
  { collection: "bookings", timestamps: true, versionKey: false },
);

bookingSchema.index({ customerEmail: 1, status: 1 });
bookingSchema.index({ technicianEmail: 1, status: 1 });

export const Booking: Model<IBooking> =
  (models.Booking as Model<IBooking>) ?? model<IBooking>("Booking", bookingSchema);
