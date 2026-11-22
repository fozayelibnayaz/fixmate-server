import mongoose, { type Model } from "mongoose";

const { Schema, model } = mongoose;
const models = mongoose.models;
import {
  APPROVAL_STATUSES,
  CATEGORIES,
  SERVICE_MODES,
  type ApprovalStatus,
  type Category,
  type ServiceMode,
} from "../config/constants";

export interface IService {
  _id: string;
  title: string;
  category: Category;
  description: string;
  image: string;
  basePrice: number;
  estimatedDuration: string;
  serviceMode: ServiceMode;
  serviceArea: string;
  technicianName: string;
  technicianEmail: string;
  approvalStatus: ApprovalStatus;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const serviceSchema = new Schema<IService>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 1, index: true },
    estimatedDuration: { type: String, required: true },
    serviceMode: { type: String, enum: SERVICE_MODES, required: true },
    serviceArea: { type: String, required: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true, lowercase: true, index: true },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUSES,
      default: "pending",
      index: true,
    },
    isAvailable: { type: Boolean, default: true },
  },
  { collection: "services", timestamps: true, versionKey: false },
);

serviceSchema.index({ approvalStatus: 1, isAvailable: 1, createdAt: -1 });

export const Service: Model<IService> =
  (models.Service as Model<IService>) ?? model<IService>("Service", serviceSchema);
