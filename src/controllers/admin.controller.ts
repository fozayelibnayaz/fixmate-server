import type { Request, Response } from "express";
import { ApiError, asyncHandler } from "../lib/http";
import { Service, type IService } from "../models/Service";

export const setServiceApproval = asyncHandler(async (req: Request, res: Response) => {
  const { approvalStatus } = req.body as { approvalStatus?: string };
  if (!approvalStatus || !["approved", "rejected", "pending"].includes(approvalStatus)) {
    throw new ApiError(400, "Invalid approval status");
  }
  const service = await Service.findByIdAndUpdate(
    req.params.id,
    { approvalStatus },
    { new: true, runValidators: true },
  );
  if (!service) throw new ApiError(404, "Service not found");
  res.json({ service });
});

export const allServicesForAdmin = asyncHandler(async (req: Request, res: Response) => {
  const status = typeof req.query.status === "string" ? req.query.status : "";
  const filter = status ? { approvalStatus: status as IService["approvalStatus"] } : {};
  const services = await Service.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ services });
});
