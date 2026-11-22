import type { Request, Response } from "express";
import { Types } from "mongoose";
import { ROLES, type Role } from "../config/constants";
import { ApiError, asyncHandler } from "../lib/http";
import { profileSchema } from "../lib/validation";
import { User, type IUser } from "../models/User";
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

// BetterAuth writes some users with a native ObjectId `_id` while the User
// schema models `_id` as a string. findById only matches string ids, so fall
// back to a raw ObjectId lookup for those accounts.
const findTargetUser = async (id: string) => {
  const document = await User.findById(id);
  if (document) {
    return {
      user: document as unknown as IUser,
      save: async (nextRole: Role) => {
        document.role = nextRole;
        await document.save();
      },
    };
  }
  if (!Types.ObjectId.isValid(id)) return null;

  const objectId = new Types.ObjectId(id);
  const raw = await User.collection.findOne({ _id: objectId });
  if (!raw) return null;
  const user = raw as unknown as IUser;
  return {
    user,
    save: async (nextRole: Role) => {
      await User.collection.updateOne({ _id: objectId }, { $set: { role: nextRole } });
      user.role = nextRole;
    },
  };
};

export const updateUserRole = asyncHandler(async (req: Request, res: Response) => {
  const { role } = req.body as { role?: string };
  if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
    throw new ApiError(400, "Invalid role");
  }
  const target = await findTargetUser(req.params.id);
  if (!target) throw new ApiError(404, "User not found");
  const nextRole = role as Role;
  if (target.user.email === req.auth?.email.toLowerCase()) {
    throw new ApiError(400, "You cannot change your own role");
  }
  if (target.user.role === "admin" && nextRole !== "admin") {
    const adminCount = await User.countDocuments({ role: "admin" });
    if (adminCount <= 1) {
      throw new ApiError(400, "At least one admin must remain");
    }
  }
  await target.save(nextRole);
  res.json({ user: publicUser(target.user) });
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
