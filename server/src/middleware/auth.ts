/**
 * Authentication middleware using JWT (JSON Web Tokens).
 *
 * Flow:
 *   1. User logs in -> server signs a token containing their user id.
 *   2. The frontend sends it on every request: `Authorization: Bearer <token>`.
 *   3. This middleware verifies the signature. If valid, it puts the user id on
 *      req.userId so route handlers know WHO is calling.
 *
 * The server stores no session - the token itself proves identity ("stateless").
 */
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { HttpError } from "../utils/HttpError";

export function signToken(userId: number): string {
  return jwt.sign({ sub: String(userId) }, config.JWT_SECRET, {
    expiresIn: config.JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
  });
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing or malformed Authorization header");
  }

  let payload: jwt.JwtPayload | string;
  try {
    payload = jwt.verify(header.slice("Bearer ".length), config.JWT_SECRET);
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  // "sub" (subject) is the standard JWT field for "who this token is about".
  const userId = typeof payload === "object" ? Number(payload.sub) : NaN;
  if (!Number.isInteger(userId)) {
    throw new HttpError(401, "Invalid token payload");
  }
  req.userId = userId;
  next();
}

/** Helper for route handlers that run after requireAuth. */
export function currentUserId(req: Request): number {
  if (req.userId === undefined) throw new HttpError(401, "Not authenticated");
  return req.userId;
}
