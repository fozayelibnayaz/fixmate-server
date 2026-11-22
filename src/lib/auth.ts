import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { MongoClient } from "mongodb";
import type { IncomingHttpHeaders } from "node:http";
import { allowedOrigins, env, googleOAuth } from "../config/env";

const mongoClient = new MongoClient(env.mongodbUri);
const database = mongoClient.db();

export const auth = betterAuth({
  appName: "FixMate",
  baseURL: env.betterAuthUrl,
  secret: env.betterAuthSecret,
  database: mongodbAdapter(database, { client: mongoClient, transaction: false }),
  trustedOrigins: allowedOrigins,
  socialProviders: googleOAuth.enabled
    ? {
        google: {
          clientId: googleOAuth.clientId,
          clientSecret: googleOAuth.clientSecret,
        },
      }
    : {},
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7,
    updateAge: 60 * 60 * 24,
  },
  user: {
    modelName: "users",
    additionalFields: {
      // input:false means a client can never sign up as admin.
      role: {
        type: "string",
        required: true,
        defaultValue: "customer",
        input: false,
      },
      phone: { type: "string", required: false },
      area: { type: "string", required: false },
      bio: { type: "string", required: false },
      // input:false keeps plan changes behind the protected subscription flow.
      plan: {
        type: "string",
        required: false,
        defaultValue: "free",
        input: false,
      },
    },
  },
});

export const authHandler = toNodeHandler(auth);

/** Closes the dedicated BetterAuth MongoClient (used by the seed script and tests). */
export const closeAuthClient = async (): Promise<void> => {
  await mongoClient.close();
};

export const getBetterAuthSession = async (headers: IncomingHttpHeaders) =>
  auth.api.getSession({ headers: fromNodeHeaders(headers) });
