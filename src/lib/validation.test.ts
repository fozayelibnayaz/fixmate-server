import { describe, expect, it } from "vitest";
import { bookingRequestSchema, finalAmountSchema, serviceSchema, signUpSchema } from "./validation";

const futureDate = new Date(Date.now() + 7 * 86_400_000).toISOString();

describe("signUpSchema", () => {
  it("accepts customer and technician roles", () => {
    expect(signUpSchema.safeParse({ name: "Nadia Islam", email: "n@fixmate.test", password: "FixMate123!", role: "customer" }).success).toBe(true);
    expect(signUpSchema.safeParse({ name: "Rahim Uddin", email: "r@fixmate.test", password: "FixMate123!", role: "technician" }).success).toBe(true);
  });

  it("rejects attempts to self-assign the admin role", () => {
    const result = signUpSchema.safeParse({ name: "Ada", email: "a@fixmate.test", password: "FixMate123!", role: "admin" });
    expect(result.success).toBe(false);
  });

  it("requires mixed-case passwords", () => {
    expect(signUpSchema.safeParse({ name: "Ada", email: "a@fixmate.test", password: "alllower123" }).success).toBe(false);
  });
});

describe("bookingRequestSchema", () => {
  const valid = {
    serviceId: "service-1",
    customerPhone: "+8801711000000",
    address: "House 12, Road 5, Dhanmondi, Dhaka",
    preferredDate: futureDate,
    problemDescription: "The screen cracked after a drop and the touch no longer responds.",
  };

  it("accepts a complete request", () => {
    expect(bookingRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects past preferred dates", () => {
    const result = bookingRequestSchema.safeParse({ ...valid, preferredDate: "2020-01-01" });
    expect(result.success).toBe(false);
  });

  it("requires a detailed problem description", () => {
    expect(bookingRequestSchema.safeParse({ ...valid, problemDescription: "Broken" }).success).toBe(false);
  });
});

describe("serviceSchema and finalAmountSchema", () => {
  const validService = {
    title: "iPhone Screen Replacement",
    category: "Smartphone",
    description: "Genuine screen with a warranty.",
    image: "https://example.com/screen.jpg",
    basePrice: 85,
    estimatedDuration: "2-3 hours",
    serviceMode: "Shop Drop-off",
    serviceArea: "Dhanmondi, Dhaka",
  };

  it("coerces numeric strings for service prices", () => {
    const result = serviceSchema.safeParse({ ...validService, basePrice: "85" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.basePrice).toBe(85);
  });

  it("rejects unknown categories", () => {
    expect(serviceSchema.safeParse({ ...validService, category: "Drone" }).success).toBe(false);
  });

  it("requires a positive final amount", () => {
    expect(finalAmountSchema.safeParse({ finalAmount: 0 }).success).toBe(false);
    expect(finalAmountSchema.safeParse({ finalAmount: "42.50" }).success).toBe(true);
  });
});
