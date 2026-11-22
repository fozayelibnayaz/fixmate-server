import type { Request, Response } from "express";
import { ApiError, asyncHandler } from "../lib/http";
import { profileSchema } from "../lib/validation";
import { User } from "../models/User";
import { Service } from "../models/Service";
import { Booking } from "../models/Booking";
import { Payment } from "../models/Payment";
import { publicUser } from "./auth.controller";

export const updateProfile = asyncHandler(async (req: Request, res: Response) => {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid profile details");
  }
  const user = await User.findOne({ email: req.auth?.email.toLowerCase() });
  if (!user) throw new ApiError(404, "User not found");

  Object.assign(user, parsed.data);
  await user.save();
  res.json({ user: publicUser(user) });
});

export const listUsers = asyncHandler(async (_req: Request, res: Response) => {
  const users = await User.find().sort({ createdAt: -1 }).lean();
  res.json({ users: users.map(publicUser) });
});

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role?: string };
  if (!role || !["customer", "technician", "admin"].includes(role)) {
    throw new ApiError(400, "Invalid role");
  }
  const target = await User.findById(req.params.id);
  if (!target) throw new ApiError(404, "User not found");
  if (target.email === req.auth?.email.toLowerCase()) {
    throw new ApiError(400, "You cannot change your own role");
  }
  target.role = role as typeof target.role;
  await target.save();
  res.json({ user: publicUser(target) });
});

export const adminStats = asyncHandler(async (_req: Request, res: Response) => {
  const [totalUsers, totalTechnicians, pendingServices, totalBookings, totalPayments] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "technician" }),
      Service.countDocuments({ approvalStatus: "pending" }),
      Booking.countDocuments(),
      Payment.countDocuments(),
    ]);
  res.json({ totalUsers, totalTechnicians, pendingServices, totalBookings, totalPayments });
});
