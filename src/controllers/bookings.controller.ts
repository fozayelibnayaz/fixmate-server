import type { Request, Response } from "express";
import { ACTIVE_BOOKING_STATUSES, type BookingStatus } from "../config/constants";
import { ApiError, asyncHandler } from "../lib/http";
import { canTransition } from "../lib/status";
import { bookingRequestSchema, finalAmountSchema } from "../lib/validation";
import { Booking, type IBooking } from "../models/Booking";
import { Service } from "../models/Service";

export const createBooking = asyncHandler(async (req: Request, res: Response) => {
  const parsed = bookingRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid request details");
  }
  if (!req.auth) throw new ApiError(401, "Unauthorized");
  if (req.auth.role !== "customer") throw new ApiError(403, "Only customers can request a repair");

  const service = await Service.findOne({
    _id: parsed.data.serviceId,
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) throw new ApiError(404, "Service not found");
  if (service.technicianEmail === req.auth.email.toLowerCase()) {
    throw new ApiError(400, "You cannot request your own service");
  }

  const duplicate = await Booking.findOne({
    serviceId: parsed.data.serviceId,
    customerEmail: req.auth.email.toLowerCase(),
    status: { $in: ACTIVE_BOOKING_STATUSES },
  });
  if (duplicate) {
    throw new ApiError(409, "You already have an active request for this service");
  }

  const booking = await Booking.create({
    serviceId: service._id,
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: req.auth.name,
    customerEmail: req.auth.email.toLowerCase(),
    customerPhone: parsed.data.customerPhone,
    address: parsed.data.address,
    preferredDate: parsed.data.preferredDate,
    problemDescription: parsed.data.problemDescription,
    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    statusHistory: [{ status: "requested", changedAt: new Date() }],
  });

  res.status(201).json({ booking });
});

export const myBookings = asyncHandler(async (req: Request, res: Response) => {
  const bookings = await Booking.find({ customerEmail: req.auth?.email.toLowerCase() })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ bookings });
});

export const technicianBookings = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filter: Record<string, unknown> = { technicianEmail: req.auth?.email.toLowerCase() };
  if (status) filter.status = status;
  const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ bookings });
});

export const cancelBooking = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    customerEmail: req.auth?.email.toLowerCase(),
  });
  if (!booking) throw new ApiError(404, "Booking not found");
  if (booking.status !== "requested") {
    throw new ApiError(400, "Only a requested job can be cancelled");
  }
  booking.status = "cancelled";
  booking.statusHistory.push({ status: "cancelled", changedAt: new Date() });
  await booking.save();
  res.json({ booking });
});

/** Challenge 3: enforce the pipeline and ownership on the server. */
export const updateBookingStatus = asyncHandler(async (req: Request, res: Response) => {
  const booking = await Booking.findOne({
    _id: req.params.id,
    technicianEmail: req.auth?.email.toLowerCase(),
  });
  if (!booking) throw new ApiError(404, "Booking not found or not owned by you");

  const nextStatus = req.body?.status as BookingStatus;
  if (!canTransition(booking.status, nextStatus)) {
    throw new ApiError(400, `Cannot change ${booking.status} to ${String(nextStatus)}`);
  }

  let finalAmount = booking.finalAmount;
  if (nextStatus === "completed") {
    const parsed = finalAmountSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "A final amount greater than zero is required");
    }
    finalAmount = parsed.data.finalAmount;
  }

  booking.status = nextStatus;
  booking.finalAmount = finalAmount;
  booking.statusHistory.push({ status: nextStatus, changedAt: new Date() });
  await booking.save();
  res.json({ booking });
});

export const allBookings = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filter = status ? { status: status as IBooking["status"] } : {};
  const bookings = await Booking.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ bookings });
});
