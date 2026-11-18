import { app, ensureDB } from "../src/app.js";

export default async function handler(req: any, res: any) {
  await ensureDB();
  return (app as any)(req, res);
}
