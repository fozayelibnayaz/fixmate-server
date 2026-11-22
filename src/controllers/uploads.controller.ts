import type { Request, Response } from "express";
import { env } from "../config/env";
import { ApiError, asyncHandler } from "../lib/http";

/** Accept both a raw base64 payload and a browser FileReader data URL. */
export const normalizeImagePayload = (value: unknown): string => {
  const image = typeof value === "string" ? value.trim() : "";
  return image.startsWith("data:") ? image.slice(image.indexOf(",") + 1) : image;
};

export const uploadImage = asyncHandler(async (req: Request, res: Response) => {
  if (!env.imgbbApiKey) {
    throw new ApiError(503, "ImgBB is not configured on the server");
  }
  const image = normalizeImagePayload(req.body?.image);
  if (!image) throw new ApiError(400, "No image supplied");

  const body = new URLSearchParams({ key: env.imgbbApiKey, image });
  const response = await fetch("https://api.imgbb.com/1/upload", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const result = (await response.json()) as {
    success?: boolean;
    data?: { url?: string; display_url?: string };
    error?: { message?: string };
  };
  if (!result.success || !result.data?.url) {
    throw new ApiError(502, result.error?.message ?? "Image upload failed");
  }
  res.json({ url: result.data.url });
});
