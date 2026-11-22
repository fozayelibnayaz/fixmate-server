import { describe, expect, it } from "vitest";
import { normalizeImagePayload } from "./uploads.controller";

describe("normalizeImagePayload", () => {
  it("passes raw base64 through", () => {
    expect(normalizeImagePayload("iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });

  it("strips the FileReader data URL prefix", () => {
    expect(normalizeImagePayload("data:image/png;base64,iVBORw0KGgo=")).toBe("iVBORw0KGgo=");
  });

  it("rejects missing or non-string values", () => {
    expect(normalizeImagePayload(undefined)).toBe("");
    expect(normalizeImagePayload(123)).toBe("");
  });
});
