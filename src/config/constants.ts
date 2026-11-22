export const ROLES = ["customer", "technician", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const PUBLIC_ROLES = ["customer", "technician"] as const;

export const CATEGORIES = [
  "Smartphone",
  "Laptop & PC",
  "AC",
  "Refrigerator",
  "TV",
  "Washing Machine",
  "Electrical",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const SERVICE_MODES = ["Home Visit", "Shop Drop-off"] as const;
export type ServiceMode = (typeof SERVICE_MODES)[number];

export const APPROVAL_STATUSES = ["pending", "approved", "rejected"] as const;
export type ApprovalStatus = (typeof APPROVAL_STATUSES)[number];

export const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const PAYMENT_STATUSES = ["unpaid", "paid"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** The only server-accepted status transitions. Anything else is rejected. */
export const ALLOWED_TRANSITIONS: Record<string, readonly BookingStatus[]> = {
  requested: ["accepted", "rejected"],
  accepted: ["in-progress"],
  "in-progress": ["completed"],
};

export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = [
  "requested",
  "accepted",
  "in-progress",
];
