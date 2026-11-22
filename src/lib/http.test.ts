import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { ApiError, errorHandler } from "./http";

const makeResponse = () => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as typeof res & Response;
};

const run = (error: unknown, res: Response) =>
  errorHandler(error, {} as Request, res, vi.fn() as NextFunction);

describe("errorHandler", () => {
  it("returns the declared status for API errors", () => {
    const res = makeResponse();
    run(new ApiError(403, "Forbidden"), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Forbidden" });
  });

  it("turns invalid MongoDB ids into a clean 404", () => {
    const res = makeResponse();
    const error = new Error("Cast to ObjectId failed for value \"not-an-id\"");
    error.name = "CastError";
    run(error, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: "Resource not found" });
  });
});
