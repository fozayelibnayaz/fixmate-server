import { describe, expect, it } from "vitest";
import { isUsableGoogleCredential } from "./env";

describe("isUsableGoogleCredential", () => {
  it("accepts real-looking Google credentials", () => {
    expect(isUsableGoogleCredential("123456789012-abc.apps.googleusercontent.com")).toBe(true);
    expect(isUsableGoogleCredential("GOCSPX-AbCdEfGhIjKlMnOpQrSt")).toBe(true);
  });

  it("rejects empty and placeholder credentials", () => {
    expect(isUsableGoogleCredential("")).toBe(false);
    expect(isUsableGoogleCredential("short")).toBe(false);
    expect(isUsableGoogleCredential("your-google-client-id.apps.googleusercontent.com")).toBe(false);
    expect(isUsableGoogleCredential("placeholder-client-id")).toBe(false);
    expect(isUsableGoogleCredential("change-me-google-secret")).toBe(false);
    expect(isUsableGoogleCredential("GOCSPX-placeholder")).toBe(false);
  });
});
