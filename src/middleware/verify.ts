import type { RequestHandler } from "express";
import { Types } from "mongoose";
import type { Role } from "../config/constants";
import { ApiError } from "../lib/http";
import { TOKEN_COOKIE, verifyTokenValue } from "../lib/jwt";
import { User } from "../models/User";

const readToken = (req: Parameters<RequestHandler>[0]): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[TOKEN_COOKIE];
  return cookieToken ?? null;
};

export const verifyToken: RequestHandler = async (req, _res, next) => {
  const token = readToken(req);
  if (!token) {
    next(new ApiError(401, "Unauthorized — please sign in"));
    return;
  }
  try {
    const claims = verifyTokenValue(token);
    // The JWT proves identity, but the database is the source of truth for the
    // role. This makes an admin's role change effective immediately without
    // waiting for the old 7-day token to expire or forcing a re-login.
    const user = await User.findById(claims.sub).select("role").lean();
    let role = user?.role as Role | undefined;
    if (!role && Types.ObjectId.isValid(claims.sub)) {
      // BetterAuth writes ObjectId `_id`s directly, while the User schema models
      // `_id` as a string for API responses. Query the raw collection so a
      // valid ObjectId stored by BetterAuth still resolves to the current role.
      const rawUser = await User.collection.findOne(
        { _id: new Types.ObjectId(claims.sub) },
        { projection: { role: 1 } },
      );
      role = rawUser?.role as Role | undefined;
    }
    if (!role) {
      next(new ApiError(401, "Account no longer exists"));
      return;
    }
    req.auth = { ...claims, role };
    next();
  } catch {
    next(new ApiError(401, "Unauthorized — invalid or expired session"));
  }
};

const requireRole = (allowed: readonly Role[]): RequestHandler => (req, _res, next) => {
  if (!req.auth) {
    next(new ApiError(401, "Unauthorized — please sign in"));
    return;
  }
  if (!allowed.includes(req.auth.role)) {
    next(new ApiError(403, "Forbidden — insufficient permissions"));
    return;
  }
  next();
};

export const verifyCustomer = requireRole(["customer"]);
export const verifyTechnician = requireRole(["technician"]);
export const verifyAdmin = requireRole(["admin"]);
