import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "../config/constants";
import { ApiError } from "../lib/http";
import { updateUserRole } from "./users.controller";

// No live Mongoose connection and no better-auth initialisation: only the
// pieces updateUserRole actually uses are stubbed.
const findById = vi.hoisted(() => vi.fn());
const countDocuments = vi.hoisted(() => vi.fn());
const collectionFindOne = vi.hoisted(() => vi.fn());
const collectionUpdateOne = vi.hoisted(() => vi.fn());

vi.mock("../models/User", () => ({
  User: {
    findById,
    countDocuments,
    findOne: vi.fn(),
    find: vi.fn(),
    collection: { findOne: collectionFindOne, updateOne: collectionUpdateOne },
  },
}));
vi.mock("../models/Service", () => ({ Service: { countDocuments: vi.fn() } }));
vi.mock("../models/Booking", () => ({ Booking: { countDocuments: vi.fn() } }));
vi.mock("../models/Payment", () => ({ Payment: { countDocuments: vi.fn() } }));
vi.mock("./auth.controller", () => ({ publicUser: (user: unknown) => user }));

// Keep the real ApiError, but unwrap asyncHandler so assertions can inspect the
// rejected error directly instead of going through Express' next plumbing.
vi.mock("../lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/http")>();
  return {
    ...actual,
    asyncHandler:
      (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => handler,
  };
});

const invoke = updateUserRole as unknown as (req: Request, res: Response) => Promise<void>;

const makeRequest = (role?: string, email = "admin@fixmate.test", id = "target-1") =>
  ({
    body: role === undefined ? {} : { role },
    params: { id },
    auth: { email },
  }) as unknown as Request;

const makeResponse = () => ({ json: vi.fn() }) as unknown as Response;

const stubTarget = (email: string, role: Role) => {
  const target = {
    _id: "target-1",
    name: "Target User",
    email,
    role,
    save: vi.fn().mockResolvedValue(undefined),
  };
  findById.mockResolvedValue(target);
  return target;
};

const expectApiError = async (promise: Promise<void>, status: number) => {
  const error = await promise.catch((cause: unknown) => cause);
  expect(error).toBeInstanceOf(ApiError);
  expect(error).toMatchObject({ status });
};

describe("updateUserRole", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("rejects an invalid role before touching the database", async () => {
    const res = makeResponse();
    await expectApiError(invoke(makeRequest("owner"), res), 400);
    expect(findById).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
  });

  it("rejects an attempt to change your own role", async () => {
    const target = stubTarget("admin@fixmate.test", "customer");
    await expectApiError(invoke(makeRequest("technician", "Admin@FixMate.test"), makeResponse()), 400);
    expect(target.save).not.toHaveBeenCalled();
  });

  it("rejects demoting the last admin", async () => {
    const target = stubTarget("other@fixmate.test", "admin");
    countDocuments.mockResolvedValue(1);
    await expectApiError(invoke(makeRequest("technician"), makeResponse()), 400);
    expect(countDocuments).toHaveBeenCalledWith({ role: "admin" });
    expect(target.save).not.toHaveBeenCalled();
  });

  it("allows demoting an admin when another admin remains", async () => {
    const target = stubTarget("other@fixmate.test", "admin");
    countDocuments.mockResolvedValue(2);
    const res = makeResponse();
    await invoke(makeRequest("technician"), res);
    expect(target.role).toBe("technician");
    expect(target.save).toHaveBeenCalledTimes(1);
  });

  it("saves a valid role change", async () => {
    const target = stubTarget("tech@fixmate.test", "customer");
    const res = makeResponse();
    await invoke(makeRequest("technician"), res);
    expect(target.role).toBe("technician");
    expect(target.save).toHaveBeenCalledTimes(1);
    expect(countDocuments).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ user: target });
  });

  it("updates roles for native ObjectId user ids", async () => {
    findById.mockResolvedValue(null);
    const raw = {
      _id: "6b02b0a5f6000abee3b17b57",
      name: "Raw User",
      email: "tech2@fixmate.test",
      role: "customer",
    };
    collectionFindOne.mockResolvedValue(raw);
    collectionUpdateOne.mockResolvedValue({ matchedCount: 1 });
    const res = makeResponse();

    await invoke(makeRequest("technician", "admin@fixmate.test", raw._id), res);

    expect(collectionFindOne).toHaveBeenCalledTimes(1);
    expect(collectionUpdateOne).toHaveBeenCalledWith(
      { _id: expect.anything() },
      { $set: { role: "technician" } },
    );
    expect(res.json).toHaveBeenCalledWith({ user: expect.objectContaining({ role: "technician" }) });
  });
});
