import { Router } from "express";
import { z } from "zod";
import { verifyToken } from "../middleware/verifyToken.js";
import { env } from "../config/env.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

router.patch("/profile", verifyToken, async (req, res, next) => {
  try {
    const body = z.object({
      name: z.string().min(2).optional(),
      phone: z.string().optional(),
      area: z.string().optional(),
      bio: z.string().optional(),
      image: z.string().optional(),
    }).parse(req.body);

    const db = (await import("mongoose")).default.connection.db!;
    const { ObjectId } = await import("mongodb");
    const user = await db.collection("user").findOne({ email: req.user!.email });
    if (!user) throw new HttpError(404, "User not found");
    const update: Record<string, unknown> = {};
    if (body.name) update.name = body.name;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.area !== undefined) update.area = body.area;
    if (body.bio !== undefined) update.bio = body.bio;
    if (body.image !== undefined) update.image = body.image;
    await db.collection("user").updateOne({ email: req.user!.email }, { $set: update });
    const updated = await db.collection("user").findOne({ email: req.user!.email });
    res.json(updated);
  } catch (e) { next(e); }
});

export default router;

// Upgrade to Pro (Stripe one-time)
router.post("/upgrade-pro", verifyToken, async (req, res, next) => {
  try {
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.stripeSecretKey || "sk_test_placeholder", { apiVersion: "2024-12-18.acacia" as any });
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [{ price_data: { currency: "usd", product_data: { name: "FixMate Pro Technician Plan" }, unit_amount: 2900 }, quantity: 1 }],
      success_url: `${env.clientUrl}/dashboard/technician?upgraded=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.clientUrl}/dashboard/technician`,
      metadata: { type: "pro_upgrade", email: req.user!.email },
      customer_email: req.user!.email,
    });
    res.json({ url: session.url });
  } catch (e) { next(e); }
});

router.get("/upgrade-verify", verifyToken, async (req, res, next) => {
  try {
    const sessionId = String(req.query.session_id ?? "");
    const Stripe = (await import("stripe")).default;
    const stripe = new Stripe(env.stripeSecretKey || "sk_test_placeholder", { apiVersion: "2024-12-18.acacia" as any });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return res.json({ upgraded: false });
    if (session.metadata?.type !== "pro_upgrade") return res.json({ upgraded: false });
    const db = (await import("mongoose")).default.connection.db!;
    await db.collection("user").updateOne({ email: req.user!.email }, { $set: { plan: "pro" } });
    res.json({ upgraded: true });
  } catch (e) { next(e); }
});
