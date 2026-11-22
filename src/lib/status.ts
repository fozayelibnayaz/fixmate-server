import { ALLOWED_TRANSITIONS, type BookingStatus } from "../config/constants";

export const canTransition = (current: BookingStatus, next: BookingStatus): boolean =>
  (ALLOWED_TRANSITIONS[current] ?? []).includes(next);
