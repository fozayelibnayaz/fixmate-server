import { Router } from "express";
import { z } from "zod";
import { Service } from "../models/Service.js";
import { verifyToken, verifyTechnician, verifyAdmin } from "../middleware/verifyToken.js";
import { HttpError } from "../middleware/errorHandler.js";

const router = Router();

const createSchema = z.object({
  title: z.string().min(3),
  category: z.enum(["Smartphone","Laptop & PC","AC","Refrigerator","TV","Washing Machine","Electrical"]),
  description: z.string().min(10),
  image: z.string().min(1),
  basePrice: z.number().positive(),
  estimatedDuration: z.string().min(1),
  serviceMode: z.enum(["Home Visit","Shop Drop-off"]),
  serviceArea: z.string().min(2),
});

// Public: list with search/filter/sort/pagination
router.get("/", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "").trim();
    const category = String(req.query.category ?? "").trim();
    const serviceMode = String(req.query.serviceMode ?? "").trim();
    const sort = String(req.query.sort ?? "newest");
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 12)));

    const filter: Record<string, unknown> = { approvalStatus: "approved", isAvailable: true };
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: "i" } },
        { category: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }
    if (category) filter.category = category;
    if (serviceMode) filter.serviceMode = serviceMode;

    const sortObj: Record<string, 1 | -1> =
      sort === "price_asc" ? { basePrice: 1 } :
      sort === "price_desc" ? { basePrice: -1 } :
      { createdAt: -1 };

    const [data, total] = await Promise.all([
      Service.find(filter).sort(sortObj).skip((page - 1) * limit).limit(limit).lean(),
      Service.countDocuments(filter),
    ]);
    res.json({ data, total, page, pages: Math.ceil(total / limit) });
  } catch (e) { next(e); }
});

router.get("/mine", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const data = await Service.find({ technicianEmail: req.user!.email }).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (e) { next(e); }
});

router.get("/:id", async (req, res, next) => {
  try {
    const s = await Service.findById(req.params.id).lean();
    if (!s || s.approvalStatus !== "approved" || !s.isAvailable) {
      throw new HttpError(404, "Service not found");
    }
    res.json(s);
  } catch (e) { next(e); }
});

router.post("/", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const body = createSchema.parse(req.body);
    // pro plan limit check
    const db = (await import("mongoose")).default.connection.db!;
    const u = await db.collection("user").findOne({ email: req.user!.email });
    const plan = u?.plan || "free";
    if (plan === "free") {
      const cnt = await Service.countDocuments({ technicianEmail: req.user!.email });
      if (cnt >= 3) throw new HttpError(403, "Free plan allows up to 3 services. Upgrade to Pro for unlimited.");
    }
    const svc = await Service.create({
      ...body,
      technicianName: req.user!.name ?? req.user!.email,
      technicianEmail: req.user!.email,
      technicianPlan: plan,
      approvalStatus: "pending",
      isAvailable: true,
    });
    res.status(201).json(svc);
  } catch (e) { next(e); }
});

router.patch("/:id", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const svc = await Service.findById(req.params.id);
    if (!svc) throw new HttpError(404, "Service not found");
    if (svc.technicianEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    const body = createSchema.partial().parse(req.body);
    Object.assign(svc, body);
    if (body.title || body.description || body.basePrice || body.category || body.serviceMode || body.serviceArea || body.estimatedDuration || body.image) {
      svc.approvalStatus = "pending";
    }
    await svc.save();
    res.json(svc);
  } catch (e) { next(e); }
});

router.delete("/:id", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const svc = await Service.findById(req.params.id);
    if (!svc) throw new HttpError(404, "Service not found");
    if (svc.technicianEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    await svc.deleteOne();
    res.json({ message: "Deleted" });
  } catch (e) { next(e); }
});

router.patch("/:id/approval", verifyToken, verifyAdmin, async (req, res, next) => {
  try {
    const { approvalStatus } = z.object({ approvalStatus: z.enum(["pending","approved","rejected"]) }).parse(req.body);
    const svc = await Service.findByIdAndUpdate(req.params.id, { approvalStatus }, { new: true });
    if (!svc) throw new HttpError(404, "Service not found");
    res.json(svc);
  } catch (e) { next(e); }
});

router.patch("/:id/availability", verifyToken, verifyTechnician, async (req, res, next) => {
  try {
    const svc = await Service.findById(req.params.id);
    if (!svc) throw new HttpError(404, "Service not found");
    if (svc.technicianEmail !== req.user!.email) throw new HttpError(403, "Forbidden");
    const { isAvailable } = z.object({ isAvailable: z.boolean() }).parse(req.body);
    svc.isAvailable = isAvailable;
    await svc.save();
    res.json(svc);
  } catch (e) { next(e); }
});

export default router;
