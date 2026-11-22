import type { RequestHandler } from "express";
import type { Role } from "../config/constants";
import { ApiError } from "../lib/http";
import { TOKEN_COOKIE, verifyTokenValue } from "../lib/jwt";

const readToken = (req: Parameters<RequestHandler>[0]): string | null => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7);
  const cookieToken = (req.cookies as Record<string, string> | undefined)?.[TOKEN_COOKIE];
  return cookieToken ?? null;
};

export const verifyToken: RequestHandler = (req, _res, next) => {
  const token = readToken(req);
  if (!token) {
    next(new ApiError(401, "Unauthorized — please sign in"));
    return;
  }
  try {
    req.auth = verifyTokenValue(token);
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
