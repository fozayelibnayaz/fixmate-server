import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";
import servicesRoutes from "./routes/services.routes.js";
import bookingsRoutes from "./routes/bookings.routes.js";
import paymentsRoutes from "./routes/payments.routes.js";
import webhooksRoutes from "./routes/webhooks.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import usersRoutes from "./routes/users.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

// CORS
app.use(cors({
  origin: [env.clientUrl, "http://localhost:3000", "https://fixmate-client.vercel.app"],
  credentials: true,
}));

app.use(helmet());
app.use(morgan("dev"));

// Webhook needs raw body BEFORE json parser
app.use("/api/webhooks", express.raw({ type: "application/json" }));
app.use("/api/webhooks", webhooksRoutes);

// JSON body for the rest
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "fixmate-server" }));

app.use("/api/services", servicesRoutes);
app.use("/api/bookings", bookingsRoutes);
app.use("/api/payments", paymentsRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", usersRoutes);

app.use(errorHandler);

// Connect DB on first import (for serverless, connect lazily)
let connected = false;
export async function ensureDB(): Promise<void> {
  if (connected) return;
  await connectDB();
  connected = true;
}
