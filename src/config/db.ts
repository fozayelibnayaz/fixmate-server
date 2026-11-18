import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB(): Promise<void> {
  await mongoose.connect(env.mongoUri);
  console.log("[db] connected");
}

export { mongoose };
