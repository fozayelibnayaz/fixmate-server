import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { isProduction } from "../config/env";
import { ApiError, asyncHandler } from "../lib/http";
import { TOKEN_COOKIE, signToken } from "../lib/jwt";
import { auth } from "../lib/auth";
import { User } from "../models/User";
import { signInSchema, signUpSchema } from "../lib/validation";
import type { IUser } from "../models/User";

// Vercel client and API use different vercel.app subdomains, which are
// cross-site. A Secure + SameSite=None cookie is required for credentialed
// requests between them in production.
const cookieOptions = {
  httpOnly: true,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  secure: isProduction,
  path: "/",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const publicUser = (user: IUser) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  image: user.image ?? "",
  role: user.role,
  phone: user.phone ?? "",
  area: user.area ?? "",
  bio: user.bio ?? "",
  createdAt: user.createdAt,
});

const issueToken = (res: Response, user: IUser) => {
  const token = signToken({
    sub: user._id,
    email: user.email,
    role: user.role,
    name: user.name,
    image: user.image,
  });
  res.cookie(TOKEN_COOKIE, token, cookieOptions);
  return token;
};

export const signUp = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signUpSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid sign-up details");
  }
  const { name, email, password, role } = parsed.data;

  try {
    await auth.api.signUpEmail({ body: { name, email: email.toLowerCase(), password } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/exist|duplicate|taken/i.test(message)) {
      throw new ApiError(409, "An account with this email already exists");
    }
    throw new ApiError(400, message || "Could not create the account");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(500, "Account was created but could not be loaded");

  // BetterAuth cannot accept a role from the client (input:false), so apply the
  // validated customer/technician choice here. Admin is never accepted.
  if (role && role !== user.role) {
    user.role = role;
    await user.save();
  }

  issueToken(res, user);
  res.status(201).json({ user: publicUser(user) });
});

export const signIn = asyncHandler(async (req: Request, res: Response) => {
  const parsed = signInSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.issues[0]?.message ?? "Invalid sign-in details");
  }
  const { email, password } = parsed.data;

  try {
    await auth.api.signInEmail({ body: { email: email.toLowerCase(), password } });
  } catch {
    throw new ApiError(401, "Invalid email or password");
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(401, "Invalid email or password");

  issueToken(res, user);
  res.json({ user: publicUser(user) });
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  if (!req.auth) throw new ApiError(401, "Unauthorized");
  const user = await User.findOne({ email: req.auth.email.toLowerCase() });
  if (!user) throw new ApiError(401, "Account no longer exists");
  res.json({ user: publicUser(user) });
});

export const signOut = asyncHandler(async (req: Request, res: Response) => {
  res.clearCookie(TOKEN_COOKIE, {
    path: "/",
    sameSite: cookieOptions.sameSite,
    secure: cookieOptions.secure,
  });
  try {
    await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
  } catch {
    // Clearing our JWT cookie is enough to end the FixMate session.
  }
  res.json({ message: "Signed out" });
});
