import type { Request, Response } from "express";
import { CATEGORIES, FREE_SERVICE_LIMIT, SERVICE_MODES } from "../config/constants";
import { ApiError, asyncHandler } from "../lib/http";
import { serviceSchema } from "../lib/validation";
import { Booking } from "../models/Booking";
import { Service } from "../models/Service";
import { User } from "../models/User";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Challenge 1: all search, filtering, sorting and pagination happens in MongoDB. */
export const listServices = asyncHandler(async (req: Request, res: Response) => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  const category = typeof req.query.category === "string" ? req.query.category : "";
  const mode = typeof req.query.mode === "string" ? req.query.mode : "";
  const sort = typeof req.query.sort === "string" ? req.query.sort : "newest";
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(24, Math.max(1, Number(req.query.limit) || 9));

  const filter: Record<string, unknown> = { approvalStatus: "approved", isAvailable: true };
  if (q) {
    const pattern = new RegExp(escapeRegex(q), "i");
    filter.$or = [{ title: pattern }, { category: pattern }, { description: pattern }];
  }
  if (category && CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    filter.category = category;
  }
  if (mode && SERVICE_MODES.includes(mode as (typeof SERVICE_MODES)[number])) {
    filter.serviceMode = mode;
  }

  const sortMap: Record<string, Record<string, 1 | -1>> = {
    "price-asc": { basePrice: 1 },
    "price-desc": { basePrice: -1 },
    newest: { createdAt: -1 },
  };

  const [services, total] = await Promise.all([
    Service.find(filter)
      .sort(sortMap[sort] ?? sortMap.newest)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Service.countDocuments(filter),
  ]);

  res.json({ services, total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) });
});

export const featuredServices = asyncHandler(async (_req: Request, res: Response) => {
  const services = await Service.find({ approvalStatus: "approved", isAvailable: true })
    .sort({ createdAt: -1 })
    .limit(6)
    .lean();
  res.json({ services });
});

export const getService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOne({
    _id: req.params.id,
    approvalStatus: "approved",
    isAvailable: true,
  }).lean();
  if (!service) throw new ApiError(404, "Service not found");
  res.json({ service });
});

/** Public, privacy-safe review feed for a service detail page. */
export const serviceReviews = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOne({
    _id: req.params.id,
    approvalStatus: "approved",
    isAvailable: true,
  }).select("_id").lean();
  if (!service) throw new ApiError(404, "Service not found");

  const bookings = await Booking.find({
    serviceId: String(service._id),
    rating: { $gte: 1, $lte: 5 },
    status: "completed",
    paymentStatus: "paid",
  })
    .sort({ updatedAt: -1 })
    .select("customerName rating review updatedAt")
    .lean();

  const reviews = bookings
    .filter((booking) => typeof booking.rating === "number")
    .map((booking) => ({
      customerName: booking.customerName,
      rating: booking.rating,
      review: booking.review ?? "",
      createdAt: booking.updatedAt,
    }));
  res.json({ reviews });
});

export const createService = asyncHandler(async (req: Request, res: Response) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid service details");
  }
  if (!req.auth) throw new ApiError(401, "Unauthorized");

  const owner = await User.findOne({ email: req.auth.email.toLowerCase() }).lean();
  const plan = owner?.plan ?? "free";
  if (plan !== "pro") {
    const listingCount = await Service.countDocuments({ technicianEmail: req.auth.email.toLowerCase() });
    if (listingCount >= FREE_SERVICE_LIMIT) {
      throw new ApiError(403, "Free technicians can list up to 3 services. Upgrade to Pro for unlimited listings.");
    }
  }

  const service = await Service.create({
    ...parsed.data,
    technicianName: req.auth.name,
    technicianEmail: req.auth.email.toLowerCase(),
    approvalStatus: "pending",
    isAvailable: true,
    technicianPlan: plan,
  });
  res.status(201).json({ service });
});

export const updateService = asyncHandler(async (req: Request, res: Response) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid service details");
  }
  const owner = await User.findOne({ email: req.auth?.email.toLowerCase() }).lean();
  const service = await Service.findOneAndUpdate(
    { _id: req.params.id, technicianEmail: req.auth?.email.toLowerCase() },
    { ...parsed.data, approvalStatus: "pending", technicianPlan: owner?.plan ?? "free" },
    { new: true, runValidators: true },
  );
  if (!service) throw new ApiError(404, "Service not found or not owned by you");
  res.json({ service });
});

export const deleteService = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOneAndDelete({
    _id: req.params.id,
    technicianEmail: req.auth?.email.toLowerCase(),
  });
  if (!service) throw new ApiError(404, "Service not found or not owned by you");
  res.json({ message: "Service deleted" });
});

export const toggleAvailability = asyncHandler(async (req: Request, res: Response) => {
  const service = await Service.findOne({ _id: req.params.id, technicianEmail: req.auth?.email.toLowerCase() });
  if (!service) throw new ApiError(404, "Service not found or not owned by you");
  service.isAvailable = !service.isAvailable;
  await service.save();
  res.json({ service });
});

export const myServices = asyncHandler(async (req: Request, res: Response) => {
  const services = await Service.find({ technicianEmail: req.auth?.email.toLowerCase() })
    .sort({ createdAt: -1 })
    .lean();
  res.json({ services });
});
