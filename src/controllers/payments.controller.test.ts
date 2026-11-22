import { Types } from "mongoose";
import { describe, expect, it } from "vitest";
import { checkoutMetadata, subscriptionMetadata } from "./payments.controller";

describe("Stripe checkout metadata", () => {
  it("converts booking ids and emails to strings", () => {
    const bookingId = new Types.ObjectId();
    const metadata = checkoutMetadata({ _id: bookingId, customerEmail: "customer@fixmate.test" });
    expect(metadata).toEqual({
      bookingId: bookingId.toString(),
      customerEmail: "customer@fixmate.test",
      kind: "booking",
    });
    expect(typeof metadata.bookingId).toBe("string");
  });

  it("identifies Pro subscription sessions separately from booking payments", () => {
    const userId = new Types.ObjectId();
    expect(subscriptionMetadata({ _id: userId, email: "tech2@fixmate.test" })).toEqual({
      bookingId: "",
      customerEmail: "tech2@fixmate.test",
      kind: "pro_subscription",
      userId: userId.toString(),
      userEmail: "tech2@fixmate.test",
      plan: "pro",
    });
  });
});
