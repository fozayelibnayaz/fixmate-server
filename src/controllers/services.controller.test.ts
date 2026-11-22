import type { NextFunction, Request, Response } from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../lib/http";

const serviceLean = vi.hoisted(() => vi.fn());
const serviceSelect = vi.hoisted(() => vi.fn(() => ({ lean: serviceLean })));
const serviceFindOne = vi.hoisted(() => vi.fn(() => ({ select: serviceSelect })));
const bookingLean = vi.hoisted(() => vi.fn());
const bookingSelect = vi.hoisted(() => vi.fn(() => ({ lean: bookingLean })));
const bookingSort = vi.hoisted(() => vi.fn(() => ({ select: bookingSelect })));
const bookingFind = vi.hoisted(() => vi.fn(() => ({ sort: bookingSort })));

vi.mock("../models/Service", () => ({
  Service: {
    findOne: serviceFindOne,
    find: vi.fn(),
    countDocuments: vi.fn(),
    create: vi.fn(),
    findOneAndUpdate: vi.fn(),
    findOneAndDelete: vi.fn(),
  },
}));
vi.mock("../models/Booking", () => ({ Booking: { find: bookingFind } }));
vi.mock("../models/User", () => ({ User: { findOne: vi.fn() } }));

vi.mock("../lib/http", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/http")>();
  return {
    ...actual,
    asyncHandler:
      (handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) => handler,
  };
});

const { serviceReviews } = await import("./services.controller");
const invoke = serviceReviews as unknown as (req: Request, res: Response) => Promise<void>;
const makeResponse = () => ({ json: vi.fn() }) as unknown as Response;

describe("serviceReviews", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    serviceSelect.mockReturnValue({ lean: serviceLean });
    serviceFindOne.mockReturnValue({ select: serviceSelect });
    bookingSort.mockReturnValue({ select: bookingSelect });
    bookingSelect.mockReturnValue({ lean: bookingLean });
    bookingFind.mockReturnValue({ sort: bookingSort });
  });

  it("returns only safe ratings from paid, completed jobs", async () => {
    serviceLean.mockResolvedValue({ _id: "service-1" });
    bookingLean.mockResolvedValue([
      {
        customerName: "Nadia Islam",
        rating: 5,
        review: "Excellent repair",
        updatedAt: new Date("2026-02-05T00:00:00.000Z"),
        customerEmail: "customer@fixmate.test",
        customerPhone: "+8801811000000",
      },
      { customerName: "Unreviewed", review: "", updatedAt: new Date() },
    ]);
    const res = makeResponse();

    await invoke({ params: { id: "service-1" } } as unknown as Request, res);

    expect(bookingFind).toHaveBeenCalledWith(
      expect.objectContaining({
        serviceId: "service-1",
        rating: { $gte: 1, $lte: 5 },
        status: "completed",
        paymentStatus: "paid",
      }),
    );
    expect(res.json).toHaveBeenCalledWith({
      reviews: [
        {
          customerName: "Nadia Islam",
          rating: 5,
          review: "Excellent repair",
          createdAt: new Date("2026-02-05T00:00:00.000Z"),
        },
      ],
    });
  });

  it("rejects reviews for a missing service", async () => {
    serviceLean.mockResolvedValue(null);
    const error = await invoke(
      { params: { id: "missing" } } as unknown as Request,
      makeResponse(),
    ).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 404 });
    expect(bookingFind).not.toHaveBeenCalled();
  });
});
