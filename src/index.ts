import { app, ensureDB } from "./app.js";
import { env } from "./config/env.js";

async function main() {
  await ensureDB();
  app.listen(env.port, () => {
    console.log(`[server] listening on ${env.port}`);
  });
}
main().catch((e) => { console.error(e); process.exit(1); });
