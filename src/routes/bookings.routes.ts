import { Router } from "express";
import { z } from "zod";
import { Booking } from "../models/Booking.js";
import { Service } from "../models/Service.js";
import { verifyToken, verifyCustomer, verifyTechnician } from "../middleware/verifyToken.js";
import { HttpError } from "../middleware/errorHandler.js";
import { canTransition, ACTIVE_STATUSES } from "../utils/status.js";

const router = Router();

const createSchema = z.object({
  serviceId: z.string().min(1),
  customerPhone: z.string().min(6),
  address: z.string().min(5),
  preferredDate: z.string().min(1),
  problemDescription: z.string().min(20),
});

// Customer: create booking
router.post("/", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    const svc = await Service.findById(body.serviceId);
    if (!svc || svc.approvalStatus !== "approved" || !svc.isAvailable) {
      throw new HttpError(404, "Service not available");
    }
    if (svc.technicianEmail === req.user!.email) {
      throw new HttpError(400, "You cannot request your own service");
    }
    const preferredDate = new Date(body.preferredDate);
    if (isNaN(preferredDate.getTime()) || preferredDate < new Date(new Date().setHours(0,0,0,0))) {
      throw new HttpError(400, "Preferred date must be today or future");
    }
    // duplicate active check
    const dup = await Booking.findOne({
      customerEmail: req.user!.email,
      serviceId: body.serviceId,
      status: { $in: ACTIVE_STATUSES },
    });
    if (dup) throw new HttpError(409, "You already have an active request for this service");

    const booking = await Booking.create({
      serviceId: svc._id.toString(),
      serviceTitle: svc.title,
      serviceImage: svc.image,
      category: svc.category,
      basePrice: svc.basePrice,
      technicianName: svc.technicianName,
      technicianEmail: svc.technicianEmail,
      customerName: req.user!.name ?? req.user!.email,
      customerEmail: req.user!.email,
      customerPhone: body.customerPhone,
      address: body.address,
      preferredDate,
      problemDescription: body.problemDescription,
      status: "requested",
      finalAmount: svc.basePrice,
      paymentStatus: "unpaid",
      statusHistory: [{ status: "requested", changedAt: new Date() }],
    });
    res.status(201).json(booking);
  } catch (e) { next(e); }
});

router.get("/my", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const data = await Booking.find({ customerEmail: req.user!.email }).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (e) { next(e); }
});

router.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const b = await Booking.findById(req.params.id);
    if (!b) throw new HttpError(404, "Booking not found");
    if (b.customerEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    if (b.status !== "requested") throw new HttpError(400, "Only requested jobs can be cancelled");
    b.status = "cancelled";
    b.statusHistory.push({ status: "cancelled", changedAt: new Date() });
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});

// Technician
router.get("/technician", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "").trim();
    const filter: Record<string, unknown> = { technicianEmail: req.user!.email };
    if (status && status !== "all") filter.status = status;
    const data = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (e) { next(e); }
});

router.patch("/:id/status", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const schema = z.object({
      status: z.enum(["accepted","rejected","in-progress","completed"]),
      finalAmount: z.number().positive().optional(),
    });
    const body = schema.parse(req.body);
    const b = await Booking.findById(req.params.id);
    if (!b) throw new HttpError(404, "Booking not found");
    if (b.technicianEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    if (!canTransition(b.status as any, body.status)) {
      throw new HttpError(400, `Invalid transition: ${b.status} -> ${body.status}`);
    }
    if (body.status === "completed") {
      if (!body.finalAmount || body.finalAmount <= 0) throw new HttpError(400, "finalAmount required");
      b.finalAmount = body.finalAmount;
    }
    b.status = body.status;
    b.statusHistory.push({ status: body.status, changedAt: new Date() });
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});



// Customer: add rating/review after paid
router.patch("/:id/review", verifyToken, verifyCustomer, async (req, res, next) => {
  try {
    const { rating, review } = (await import("zod")).z.object({ rating: (await import("zod")).z.number().min(1).max(5), review: (await import("zod")).z.string().optional() }).parse(req.body);
    const b = await Booking.findById(req.params.id);
    if (!b) throw new HttpError(404, "Booking not found");
    if (b.customerEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    if (b.paymentStatus !== "paid") throw new HttpError(400, "Can only review paid bookings");
    b.rating = rating;
    b.review = review;
    await b.save();
    res.json(b);
  } catch (e) { next(e); }
});

// Service rating aggregate (public)
router.get("/service/:serviceId/rating", async (req, res, next) => {
  try {
    const agg = await Booking.aggregate([
      { $match: { serviceId: req.params.serviceId, rating: { $exists: true } } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    res.json({ avg: agg[0]?.avg ?? 0, count: agg[0]?.count ?? 0 });
  } catch (e) { next(e); }
});

export default router;
