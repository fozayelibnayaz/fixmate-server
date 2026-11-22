import mongoose, { type Model } from "mongoose";

const { Schema, model } = mongoose;
const models = mongoose.models;
import { ROLES, type Role } from "../config/constants";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  image?: string;
  role: Role;
  phone?: string;
  area?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, default: "" },
    role: { type: String, enum: ROLES, default: "customer", index: true },
    phone: { type: String, default: "" },
    area: { type: String, default: "" },
    bio: { type: String, default: "" },
  },
  { collection: "users", timestamps: true, versionKey: false },
);

export const User: Model<IUser> =
  (models.User as Model<IUser>) ?? model<IUser>("User", userSchema);
