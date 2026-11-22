import { describe, expect, it } from "vitest";
import type { BookingStatus } from "../config/constants";
import { canTransition } from "./status";

describe("job status pipeline", () => {
  it("allows only the documented forward transitions", () => {
    expect(canTransition("requested", "accepted")).toBe(true);
    expect(canTransition("requested", "rejected")).toBe(true);
    expect(canTransition("accepted", "in-progress")).toBe(true);
    expect(canTransition("in-progress", "completed")).toBe(true);
  });

  it("rejects skips, backwards moves and terminal-state changes", () => {
    expect(canTransition("requested", "completed")).toBe(false);
    expect(canTransition("requested", "in-progress")).toBe(false);
    expect(canTransition("completed", "paid" as BookingStatus)).toBe(false);
    expect(canTransition("cancelled", "accepted")).toBe(false);
    expect(canTransition("rejected", "accepted")).toBe(false);
  });
});
