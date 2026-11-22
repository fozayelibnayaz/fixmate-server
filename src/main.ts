import { createApp } from "./app";
import { env } from "./config/env";
import { connectDatabase } from "./lib/db";

const start = async () => {
  await connectDatabase();
  const app = createApp();
  app.listen(env.port, () => {
    console.log(`[fixmate] API listening on http://localhost:${env.port}`);
  });
};

start().catch((error) => {
  console.error("[fixmate] failed to start:", error);
  process.exit(1);
});
