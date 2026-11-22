import express from "express";
import { createApp } from "./src/app";

const app = createApp({ ensureDatabase: true });

// Keep the runtime import so Vercel's bundle includes Express directly.
void express.json;

export default app;
