import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { oauthProviders, safeNextPath, startGoogleSignIn } from "./auth.controller";

const makeResponse = () => {
  const res = {
    append: vi.fn().mockReturnThis(),
    cookie: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    redirect: vi.fn().mockReturnThis(),
    status: vi.fn().mockReturnThis(),
  };
  return res as typeof res & Response;
};

describe("Google sign-in capability", () => {
  it("reports Google as disabled while placeholder keys are installed", () => {
    const res = makeResponse();
    oauthProviders({} as Request, res);
    expect(res.json).toHaveBeenCalledWith({ providers: { google: false } });
  });

  it("refuses to start OAuth when Google is not configured", async () => {
    const res = makeResponse();
    const next = vi.fn() as NextFunction;
    await startGoogleSignIn({ query: {} } as Request, res, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
    expect(res.redirect).not.toHaveBeenCalled();
  });
});

describe("safeNextPath", () => {
  it("allows same-site relative paths", () => {
    expect(safeNextPath("/dashboard/customer")).toBe("/dashboard/customer");
  });

  it("rejects protocol-relative, absolute and malformed paths", () => {
    expect(safeNextPath("//evil.example")).toBe("");
    expect(safeNextPath("/\\evil.example")).toBe("");
    expect(safeNextPath("https://evil.example")).toBe("");
    expect(safeNextPath("/dashboard\nLocation: https://evil.example")).toBe("");
    expect(safeNextPath(undefined)).toBe("");
  });
});
