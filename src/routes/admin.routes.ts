import { Router } from "express";
import { z } from "zod";
import { Service } from "../models/Service.js";
import { Booking } from "../models/Booking.js";
import { Payment } from "../models/Payment.js";
import { verifyToken, verifyAdmin } from "../middleware/verifyToken.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();
router.use(verifyToken, verifyAdmin);

router.get("/users", async (_req, res, next) => {
  try {
    // users live in BetterAuth's collection named "user"
    const db = (await import("mongoose")).default.connection.db!;
    const users = await db.collection("user").find({}).sort({ createdAt: -1 }).toArray();
    res.json({ data: users });
  } catch (e) { next(e); }
});

router.patch("/users/:id/role", async (req, res, next) => {
  try {
    const { role } = z.object({ role: z.enum(["customer","technician","admin"]) }).parse(req.body);
    const db = (await import("mongoose")).default.connection.db!;
    const { ObjectId } = await import("mongodb");
    const user = await db.collection("user").findOne({ _id: new ObjectId(req.params.id) });
    if (!user) throw new HttpError(404, "User not found");
    if (user.email === req.user!.email) throw new HttpError(400, "Cannot change your own role");
    await db.collection("user").updateOne({ _id: new ObjectId(req.params.id) }, { $set: { role } });
    res.json({ message: "Updated" });
  } catch (e) { next(e); }
});

router.patch("/services/:id/approval", async (req, res, next) => {
  try {
    const { approvalStatus } = z.object({ approvalStatus: z.enum(["pending","approved","rejected"]) }).parse(req.body);
    const svc = await Service.findByIdAndUpdate(req.params.id, { approvalStatus }, { new: true });
    if (!svc) throw new HttpError(404, "Service not found");
    res.json(svc);
  } catch (e) { next(e); }
});

router.get("/services", async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.approvalStatus = status;
    const data = await Service.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (e) { next(e); }
});

router.get("/bookings", async (req, res, next) => {
  try {
    const status = String(req.query.status ?? "").trim();
    const filter: Record<string, unknown> = {};
    if (status && status !== "all") filter.status = status;
    const data = await Booking.find(filter).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (e) { next(e); }
});

router.get("/payments", async (_req, res, next) => {
  try {
    const data = await Payment.find({}).sort({ paidAt: -1 }).lean();
    const totalRevenue = data.reduce((s, p) => s + p.amount, 0);
    res.json({ data, totalRevenue });
  } catch (e) { next(e); }
});

router.get("/stats", async (_req, res, next) => {
  try {
    const db = (await import("mongoose")).default.connection.db!;
    const totalUsers = await db.collection("user").countDocuments();
    const totalTechnicians = await db.collection("user").countDocuments({ role: "technician" });
    const pendingServices = await Service.countDocuments({ approvalStatus: "pending" });
    const totalBookings = await Booking.countDocuments();
    const totalRevenueAgg = await Payment.aggregate([{ $group: { _id: null, total: { $sum: "$amount" } } }]);
    res.json({
      totalUsers, totalTechnicians, pendingServices, totalBookings,
      totalRevenue: totalRevenueAgg[0]?.total ?? 0,
    });
  } catch (e) { next(e); }
});

export default router;
