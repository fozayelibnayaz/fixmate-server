import { fromNodeHeaders } from "better-auth/node";
import type { Request, Response } from "express";
import { Types } from "mongoose";
import type { Role } from "../config/constants";
import { env, googleOAuth, isProduction } from "../config/env";
import { ApiError, asyncHandler } from "../lib/http";
import { TOKEN_COOKIE, signToken } from "../lib/jwt";
import { auth, getBetterAuthSession } from "../lib/auth";
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

type TokenUser = Pick<IUser, "_id" | "name" | "email" | "role" | "image">;

const issueToken = (res: Response, user: TokenUser) => {
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

const ROLE_HOME: Record<Role, string> = {
  customer: "/dashboard/customer",
  technician: "/dashboard/technician",
  admin: "/dashboard/admin",
};

/** Accept only same-site relative paths for post-login redirects. */
export const safeNextPath = (value: unknown): string => {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.includes("\\") ||
    Array.from(value).some((character) => character.charCodeAt(0) < 32)
  ) {
    return "";
  }
  return value;
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

/** Lets the client hide social login while placeholder keys are installed. */
export const oauthProviders = (_req: Request, res: Response) => {
  res.json({ providers: { google: googleOAuth.enabled } });
};

/**
 * Starts Google OAuth on the API host so BetterAuth's state cookie stays
 * first-party. The browser is redirected back here after Google approves.
 */
export const startGoogleSignIn = asyncHandler(async (req: Request, res: Response) => {
  if (!googleOAuth.enabled) throw new ApiError(503, "Google sign-in is not configured");

  const callbackURL = new URL("/api/session/oauth/google/callback", env.betterAuthUrl);
  const next = safeNextPath(req.query.next);
  if (next) callbackURL.searchParams.set("next", next);

  const authResponse = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL: callbackURL.toString(),
      errorCallbackURL: `${env.clientUrl}/sign-in?error=google`,
    },
    headers: fromNodeHeaders(req.headers),
    asResponse: true,
  });

  if (!authResponse.ok) {
    const detail = (await authResponse.json().catch(() => null)) as { message?: string } | null;
    throw new ApiError(502, detail?.message ?? "Could not start Google sign-in");
  }

  for (const cookie of authResponse.headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }

  const target = authResponse.headers.get("location");
  if (!target) throw new ApiError(502, "Google sign-in did not return an authorization URL");
  res.redirect(302, target);
});

/** Exchanges the BetterAuth session created by Google for our role-aware JWT. */
export const googleCallback = asyncHandler(async (req: Request, res: Response) => {
  const session = await getBetterAuthSession(req.headers);
  if (!session?.user?.email) throw new ApiError(401, "Google sign-in session not found");

  const email = session.user.email.toLowerCase();
  const dbUser = await User.findOne({ email });
  let rawUser: Record<string, unknown> | null = null;
  if (!dbUser && Types.ObjectId.isValid(session.user.id)) {
    rawUser = await User.collection.findOne({ _id: new Types.ObjectId(session.user.id) });
  }

  const sessionRole = (session.user as { role?: Role }).role;
  const role = (dbUser?.role ??
    (rawUser?.role as Role | undefined) ??
    sessionRole ??
    "customer") as Role;
  const stringValue = (value: unknown) => (typeof value === "string" ? value : "");
  const id = dbUser ? String(dbUser._id) : String(rawUser?._id ?? session.user.id);

  issueToken(res, {
    _id: id,
    email,
    role,
    name: dbUser?.name || stringValue(rawUser?.name) || session.user.name || "FixMate user",
    image: dbUser?.image || stringValue(rawUser?.image) || stringValue(session.user.image),
  });

  const next = safeNextPath(req.query.next);
  res.redirect(302, `${env.clientUrl}${next || ROLE_HOME[role]}`);
});
