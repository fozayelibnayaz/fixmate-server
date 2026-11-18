import { Schema, model, type Document } from "mongoose";

export type ServiceCategory =
  | "Smartphone" | "Laptop & PC" | "AC" | "Refrigerator" | "TV" | "Washing Machine" | "Electrical";

export type ServiceMode = "Home Visit" | "Shop Drop-off";
export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface IService extends Document {
  title: string;
  category: ServiceCategory;
  description: string;
  image: string;
  basePrice: number;
  estimatedDuration: string;
  serviceMode: ServiceMode;
  serviceArea: string;
  technicianName: string;
  technicianEmail: string;
  technicianPlan?: string;
  approvalStatus: ApprovalStatus;
  isAvailable: boolean;
  createdAt: Date;
}

const ServiceSchema = new Schema<IService>(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, required: true, enum: ["Smartphone","Laptop & PC","AC","Refrigerator","TV","Washing Machine","Electrical"] },
    description: { type: String, required: true },
    image: { type: String, required: true },
    basePrice: { type: Number, required: true, min: 0 },
    estimatedDuration: { type: String, required: true },
    serviceMode: { type: String, required: true, enum: ["Home Visit","Shop Drop-off"] },
    serviceArea: { type: String, required: true },
    technicianName: { type: String, required: true },
    technicianEmail: { type: String, required: true },
    technicianPlan: { type: String, default: 'free' },
    approvalStatus: { type: String, enum: ["pending","approved","rejected"], default: "pending" },
    isAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

ServiceSchema.index({ approvalStatus: 1, isAvailable: 1, createdAt: -1 });
ServiceSchema.index({ technicianEmail: 1 });

export const Service = model<IService>("Service", ServiceSchema);
