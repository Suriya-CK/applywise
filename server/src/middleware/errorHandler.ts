/**
 * Central error handling - registered LAST in app.ts.
 *
 * Express recognises an error handler because it takes 4 arguments.
 * In Express 5, errors thrown inside async route handlers are forwarded here
 * automatically, so routes don't need try/catch everywhere.
 */
import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/HttpError";

export function notFound(req: Request) {
  throw new HttpError(404, `Route not found: ${req.method} ${req.originalUrl}`);
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, details: err.details });
    return;
  }

  // body-parser errors (e.g. malformed JSON) carry their own 4xx status.
  const status = (err as { status?: number })?.status;
  if (typeof status === "number" && status >= 400 && status < 500) {
    res.status(status).json({ error: "Bad request" });
    return;
  }

  // Unknown error: log the details on the server, but never leak them to clients.
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
