import { Router, type RequestHandler } from "express";
import { authHandler } from "../lib/auth";
import * as auth from "../controllers/auth.controller";
import * as services from "../controllers/services.controller";
import * as bookings from "../controllers/bookings.controller";
import * as payments from "../controllers/payments.controller";
import * as users from "../controllers/users.controller";
import * as admin from "../controllers/admin.controller";
import * as uploads from "../controllers/uploads.controller";
import { verifyAdmin, verifyCustomer, verifyTechnician, verifyToken } from "../middleware/verify";

export const apiRouter = Router();

// BetterAuth owns /api/auth/*splat. It must see the raw request body.
apiRouter.all("/auth/*splat", authHandler as unknown as RequestHandler);

// Session bridge: BetterAuth + our JWT cookie used by the role middlewares.
apiRouter.post("/session/signup", auth.signUp);
apiRouter.post("/session/signin", auth.signIn);
apiRouter.post("/session/signout", auth.signOut);
apiRouter.get("/session/me", verifyToken, auth.me);

// Optional Google login. The capability endpoint is public so the client can
// hide the button while placeholder credentials are installed.
apiRouter.get("/session/providers", auth.oauthProviders);
apiRouter.get("/session/oauth/google", auth.startGoogleSignIn);
apiRouter.get("/session/oauth/google/callback", auth.googleCallback);

// Public service catalogue.
apiRouter.get("/services/featured", services.featuredServices);
apiRouter.get("/services", services.listServices);
apiRouter.get("/services/:id/reviews", services.serviceReviews);
apiRouter.get("/services/:id", services.getService);

// Technician-owned service CRUD.
apiRouter.get("/services/mine/list", verifyToken, verifyTechnician, services.myServices);
apiRouter.post("/services", verifyToken, verifyTechnician, services.createService);
apiRouter.patch("/services/:id", verifyToken, verifyTechnician, services.updateService);
apiRouter.delete("/services/:id", verifyToken, verifyTechnician, services.deleteService);
apiRouter.patch("/services/:id/availability", verifyToken, verifyTechnician, services.toggleAvailability);

// Customer booking flow.
apiRouter.post("/bookings", verifyToken, verifyCustomer, bookings.createBooking);
apiRouter.get("/bookings/my", verifyToken, verifyCustomer, bookings.myBookings);
apiRouter.patch("/bookings/:id/cancel", verifyToken, verifyCustomer, bookings.cancelBooking);
apiRouter.post("/bookings/:id/rating", verifyToken, verifyCustomer, bookings.rateBooking);

// Technician job management.
apiRouter.get("/bookings/technician", verifyToken, verifyTechnician, bookings.technicianBookings);
apiRouter.patch("/bookings/:id/status", verifyToken, verifyTechnician, bookings.updateBookingStatus);

// Payments. The webhook is mounted in app.ts before the JSON parser so Stripe
// signatures are verified against the untouched raw body.
apiRouter.post("/payments/create-checkout-session", verifyToken, verifyCustomer, payments.createCheckoutSession);
apiRouter.post("/payments/pro-checkout", verifyToken, verifyTechnician, payments.createProCheckoutSession);
apiRouter.get("/payments/verify", verifyToken, payments.verifyPayment);
apiRouter.get("/payments/my", verifyToken, verifyCustomer, payments.myPayments);
apiRouter.get("/payments/subscription", verifyToken, verifyTechnician, payments.mySubscriptionPayments);
apiRouter.get("/payments/:id/invoice", verifyToken, payments.downloadInvoice);

// Profile + uploads (any authenticated role).
apiRouter.patch("/users/profile", verifyToken, users.updateProfile);
apiRouter.post("/uploads/image", verifyToken, uploads.uploadImage);

// Admin.
apiRouter.get("/admin/users", verifyToken, verifyAdmin, users.listUsers);
apiRouter.patch("/admin/users/:id/role", verifyToken, verifyAdmin, users.updateUserRole);
apiRouter.get("/admin/stats", verifyToken, verifyAdmin, users.adminStats);
apiRouter.get("/admin/services", verifyToken, verifyAdmin, admin.allServicesForAdmin);
apiRouter.patch("/admin/services/:id/approval", verifyToken, verifyAdmin, admin.setServiceApproval);
apiRouter.get("/admin/bookings", verifyToken, verifyAdmin, bookings.allBookings);
apiRouter.get("/admin/payments", verifyToken, verifyAdmin, payments.allPayments);
