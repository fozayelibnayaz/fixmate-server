import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { TOKEN_COOKIE, signToken } from "../lib/jwt";
import { verifyAdmin, verifyCustomer, verifyTechnician, verifyToken } from "./verify";

const makeRequest = (token?: string) =>
  ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
    cookies: {},
  }) as unknown as Request;

const makeDeps = () => {
  const next = vi.fn() as unknown as NextFunction;
  const res = {} as Response;
  return { next, res };
};

const tokenFor = (role: "customer" | "technician" | "admin") =>
  signToken({ sub: "1", email: "test@example.com", role, name: "Test" });

describe("role middleware", () => {
  it("returns 401 when no token is present", () => {
    const { next, res } = makeDeps();
    verifyToken(makeRequest(), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it("returns 401 for an invalid token", () => {
    const { next, res } = makeDeps();
    verifyToken(makeRequest("garbage"), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
  });

  it("sets the authenticated principal for a valid token", () => {
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    verifyToken(req, res, next);
    expect(req.auth?.role).toBe("customer");
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 403 when the role is wrong", () => {
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    verifyToken(req, res, next);
    verifyAdmin(req, res, next);
    expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("lets matching roles through", () => {
    const { next, res } = makeDeps();
    const technicianRequest = makeRequest(tokenFor("technician"));
    const customerRequest = makeRequest(tokenFor("customer"));
    verifyToken(technicianRequest, res, next);
    verifyTechnician(technicianRequest, res, next);
    verifyToken(customerRequest, res, next);
    verifyCustomer(customerRequest, res, next);
    expect(next).toHaveBeenCalledTimes(4);
    expect(next).toHaveBeenLastCalledWith();
  });

  it("accepts the httpOnly JWT cookie", () => {
    const { next, res } = makeDeps();
    const req = { headers: {}, cookies: { [TOKEN_COOKIE]: tokenFor("admin") } } as unknown as Request;
    verifyToken(req, res, next);
    expect(req.auth?.role).toBe("admin");
  });
});
