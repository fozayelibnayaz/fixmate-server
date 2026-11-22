import jwt from "jsonwebtoken";
import { env } from "../config/env";
import type { Role } from "../config/constants";

export const TOKEN_COOKIE = "fixmate_token";

export interface TokenPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  image?: string;
}

export const signToken = (payload: TokenPayload): string =>
  jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn } as jwt.SignOptions);

export const verifyTokenValue = (token: string): TokenPayload =>
  jwt.verify(token, env.jwtSecret) as TokenPayload;
