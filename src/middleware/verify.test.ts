import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../config/constants";
import { TOKEN_COOKIE, signToken } from "../lib/jwt";
import { verifyAdmin, verifyCustomer, verifyTechnician, verifyToken } from "./verify";

// Keep the middleware offline: the token proves identity, while this stubbed
// lookup decides the role that verifyToken puts on req.auth.
const findById = vi.hoisted(() => vi.fn());
const rawFindOne = vi.hoisted(() => vi.fn());

vi.mock("../models/User", () => ({
  User: { findById, collection: { findOne: rawFindOne } },
}));

const stubDbRole = (role: Role | null) => {
  const lean = vi.fn().mockResolvedValue(role ? { role } : null);
  const select = vi.fn().mockReturnValue({ lean });
  findById.mockReturnValue({ select });
};

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

const tokenFor = (role: Role, sub = "1") =>
  signToken({ sub, email: "test@example.com", role, name: "Test" });

describe("role middleware", () => {
  beforeEach(() => {
    findById.mockReset();
    rawFindOne.mockReset();
    stubDbRole("customer");
  });

  it("returns 401 when no token is present", async () => {
    const { next, res } = makeDeps();
    await verifyToken(makeRequest(), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    expect(findById).not.toHaveBeenCalled();
  });

  it("returns 401 for an invalid token", async () => {
    const { next, res } = makeDeps();
    await verifyToken(makeRequest("garbage"), res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 401 }));
    expect(findById).not.toHaveBeenCalled();
  });

  it("sets the authenticated principal for a valid token", async () => {
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    await verifyToken(req, res, next);
    expect(findById).toHaveBeenCalledWith("1");
    expect(req.auth?.role).toBe("customer");
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 401 when the account no longer exists", async () => {
    stubDbRole(null);
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    await verifyToken(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, message: "Account no longer exists" }),
    );
    expect(req.auth).toBeUndefined();
  });

  it("uses the database role instead of the stale JWT role", async () => {
    stubDbRole("admin");
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    await verifyToken(req, res, next);
    expect(findById).toHaveBeenCalledWith("1");
    expect(req.auth?.role).toBe("admin");
    expect(next).toHaveBeenCalledWith();
  });

  it("falls back to a raw ObjectId lookup for BetterAuth user ids", async () => {
    const objectId = "6b02b0a4f6000abee3b17b4e";
    stubDbRole(null);
    rawFindOne.mockResolvedValue({ role: "technician" });
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer", objectId));
    await verifyToken(req, res, next);
    expect(rawFindOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { projection: { role: 1 } },
    );
    expect(req.auth?.role).toBe("technician");
    expect(next).toHaveBeenCalledWith();
  });

  it("returns 403 when the role is wrong", async () => {
    const { next, res } = makeDeps();
    const req = makeRequest(tokenFor("customer"));
    await verifyToken(req, res, next);
    verifyAdmin(req, res, next);
    expect(next).toHaveBeenLastCalledWith(expect.objectContaining({ status: 403 }));
  });

  it("lets matching roles through", async () => {
    const { next, res } = makeDeps();
    const technicianRequest = makeRequest(tokenFor("technician"));
    const customerRequest = makeRequest(tokenFor("customer"));
    stubDbRole("technician");
    await verifyToken(technicianRequest, res, next);
    stubDbRole("customer");
    await verifyToken(customerRequest, res, next);
    verifyTechnician(technicianRequest, res, next);
    verifyCustomer(customerRequest, res, next);
    expect(next).toHaveBeenCalledTimes(4);
    expect(next).toHaveBeenLastCalledWith();
  });

  it("accepts the httpOnly JWT cookie", async () => {
    stubDbRole("admin");
    const { next, res } = makeDeps();
    const req = { headers: {}, cookies: { [TOKEN_COOKIE]: tokenFor("admin") } } as unknown as Request;
    await verifyToken(req, res, next);
    expect(req.auth?.role).toBe("admin");
    expect(next).toHaveBeenCalledWith();
  });
});
