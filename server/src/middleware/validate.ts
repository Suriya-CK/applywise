/**
 * Validation middleware.
 *
 * Middleware is a function that runs BEFORE the route handler. It can inspect or
 * change the request, stop it (by throwing an error), or call next() to pass it
 * on. Think of it like FastAPI's Depends().
 *
 * This one checks req.body (or req.params) against a Zod schema and replaces it
 * with the parsed, type-safe value. Invalid input -> 400 Bad Request.
 */
import type { NextFunction, Request, Response } from "express";
import { z } from "zod";
import { HttpError } from "../utils/HttpError";

export function validateBody(schema: z.ZodType) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      throw new HttpError(400, "Validation failed", z.flattenError(result.error).fieldErrors);
    }
    req.body = result.data;
    next();
  };
}
