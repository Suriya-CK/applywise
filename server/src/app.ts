/**
 * Builds the Express app (but does not start listening).
 *
 * Keeping this separate from index.ts lets tests import the app and send fake
 * HTTP requests to it with Supertest, without opening a real port.
 *
 * The ORDER of app.use() calls matters: each request flows through the
 * middleware top to bottom, like a pipeline.
 */
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { config } from "./config";
import { authRouter } from "./routes/auth.routes";
import { applicationsRouter } from "./routes/applications.routes";
import { aiRouter } from "./routes/ai.routes";
import { errorHandler, notFound } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet()); // sets secure HTTP headers
  app.use(cors({ origin: config.CORS_ORIGIN })); // only our frontend may call the API from a browser
  app.use(express.json({ limit: "100kb" })); // parse JSON bodies into req.body

  // Basic protection against brute force / abuse: 300 requests per 15 minutes per IP.
  app.use("/api", rateLimit({ windowMs: 15 * 60_000, limit: 300, standardHeaders: true, legacyHeaders: false }));

  // Health check - used by Docker / load balancers to know the app is alive.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // API versioning ("/v1") lets us change the API later without breaking old clients.
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/applications", applicationsRouter);
  app.use("/api/v1/ai", aiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
