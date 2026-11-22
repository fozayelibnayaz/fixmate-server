import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import { allowedOrigins } from "./config/env";
import { errorHandler } from "./lib/http";
import { stripeWebhook } from "./controllers/payments.controller";
import { apiRouter } from "./routes";

export const createApp = () => {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors({ origin: allowedOrigins, credentials: true }));
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  // Stripe needs the untouched raw body for signature verification.
  app.use("/api/payments/webhook", express.raw({ type: "application/json" }), stripeWebhook);

  app.use(express.json({ limit: "12mb" }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 40,
    standardHeaders: "draft-7",
    legacyHeaders: false,
  });
  app.use("/api/session", authLimiter);

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "fixmate-api" }));
  app.use("/api", apiRouter);

  app.use(errorHandler);
  return app;
};
