import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { checkoutMetadata } from "./payments.controller";

describe("checkoutMetadata", () => {
  it("converts ObjectIds and emails to strings for Stripe", () => {
    const bookingId = new Types.ObjectId();
    const metadata = checkoutMetadata({ _id: bookingId, customerEmail: "customer@fixmate.test" });
    expect(metadata).toEqual({
      bookingId: bookingId.toString(),
      customerEmail: "customer@fixmate.test",
    });
    expect(typeof metadata.bookingId).toBe("string");
  });
});
