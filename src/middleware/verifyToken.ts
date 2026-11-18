import type { Request, Response, NextFunction } from "express";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { env } from "../config/env.js";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: "customer" | "technician" | "admin";
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const JWKS_URL = `${env.clientUrl}/api/auth/jwks`;
const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyToken(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ message: "Unauthorized: missing token" });
    return;
  }
  const token = header.slice(7);
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer: undefined });
    if (!payload.email) {
      res.status(401).json({ message: "Unauthorized: invalid token" });
      return;
    }
    req.user = {
      id: String(payload.sub ?? payload.id ?? ""),
      email: String(payload.email),
      name: payload.name ? String(payload.name) : undefined,
      role: (payload.role as AuthUser["role"]) ?? "customer",
    };
    next();
  } catch (e) {
    res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
}

export const verifyCustomer = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) return void res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "customer") return void res.status(403).json({ message: "Forbidden: customers only" });
  next();
};

export const verifyTechnician = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) return void res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "technician") return void res.status(403).json({ message: "Forbidden: technicians only" });
  next();
};

export const verifyAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) return void res.status(401).json({ message: "Unauthorized" });
  if (req.user.role !== "admin") return void res.status(403).json({ message: "Forbidden: admins only" });
  next();
};
