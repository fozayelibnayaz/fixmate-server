import Stripe from "stripe";
import { env } from "../config/env";
import { ApiError } from "./http";

let client: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!env.stripeSecretKey) {
    throw new ApiError(503, "Stripe test keys are not configured on the server");
  }
  client ??= new Stripe(env.stripeSecretKey);
  return client;
};
