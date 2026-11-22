const first = (...values: Array<string | undefined>): string | undefined =>
  values.find((value) => Boolean(value && value.trim()));

export const env = {
  nodeEnv: first(process.env.NODE_ENV, "development"),
  port: Number(first(process.env.PORT, "4000")),
  clientUrl: first(process.env.CLIENT_URL, "http://localhost:3000")!,
  corsAllowedOrigins: first(
    process.env.CORS_ALLOWED_ORIGINS,
    process.env.CLIENT_URL,
    "http://localhost:3000",
  )!,
  mongodbUri: first(process.env.MONGODB_URI, "mongodb://127.0.0.1:27017/fixmate")!,
  betterAuthUrl: first(process.env.BETTER_AUTH_URL, "http://localhost:4000")!,
  betterAuthSecret: first(process.env.BETTER_AUTH_SECRET, "dev-only-better-auth-secret")!,
  jwtSecret: first(process.env.JWT_SECRET, "dev-only-jwt-secret")!,
  jwtExpiresIn: first(process.env.JWT_EXPIRES_IN, "7d")!,
  imgbbApiKey: first(process.env.IMGBB_API_KEY, ""),
  stripeSecretKey: first(process.env.STRIPE_SECRET_KEY, ""),
  stripeWebhookSecret: first(process.env.STRIPE_WEBHOOK_SECRET, ""),
  stripeSuccessUrl: first(
    process.env.STRIPE_SUCCESS_URL,
    "http://localhost:3000/payment/success",
  )!,
  stripeCancelUrl: first(
    process.env.STRIPE_CANCEL_URL,
    "http://localhost:3000/payment/cancel",
  )!,
  adminEmail: first(process.env.ADMIN_EMAIL, "admin@fixmate.test")!,
  adminPassword: first(process.env.ADMIN_PASSWORD, "ChangeMe123!")!,
};

export const allowedOrigins = Array.from(
  new Set(
    [env.clientUrl, env.betterAuthUrl, ...env.corsAllowedOrigins.split(",")]
      .map((origin) => origin.trim())
      .filter(Boolean),
  ),
);

export const isProduction = env.nodeEnv === "production";
