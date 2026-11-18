import "dotenv/config";

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === "") {
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Missing required env: ${name}`);
    }
    return "";
  }
  return v;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 5000),
  mongoUri: req("MONGODB_URI", "mongodb://127.0.0.1:27017/fixmate"),
  betterAuthSecret: req("BETTER_AUTH_SECRET", "dev-secret-change-me"),
  clientUrl: req("CLIENT_URL", "http://localhost:3000"),
  stripeSecretKey: req("STRIPE_SECRET_KEY", ""),
  stripeWebhookSecret: req("STRIPE_WEBHOOK_SECRET", ""),
  imgbbApiKey: req("IMGBB_API_KEY", ""),
  jwtIssuer: process.env.JWT_ISSUER ?? "fixmate",
};
