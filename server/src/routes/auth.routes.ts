/**
 * Auth routes: register, login, and "who am I".
 *
 *   POST /api/v1/auth/register
 *   POST /api/v1/auth/login
 *   GET  /api/v1/auth/me        (needs a token)
 */
import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { validateBody } from "../middleware/validate";
import { currentUserId, requireAuth, signToken } from "../middleware/auth";
import { createUser, findUserByEmail, findUserById } from "../repositories/users.repo";
import { HttpError } from "../utils/HttpError";

export const authRouter = Router();

const registerSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.email().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

const loginSchema = z.object({
  email: z.email().toLowerCase(),
  password: z.string().min(1),
});

authRouter.post("/register", validateBody(registerSchema), async (req, res) => {
  const { name, email, password } = req.body as z.infer<typeof registerSchema>;

  if (await findUserByEmail(email)) {
    throw new HttpError(409, "An account with this email already exists");
  }

  // Never store plain passwords. bcrypt hashes them with a random salt; "10" is the cost factor.
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await createUser(name, email, passwordHash);

  res.status(201).json({ user, token: signToken(user.id) });
});

authRouter.post("/login", validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body as z.infer<typeof loginSchema>;
  const user = await findUserByEmail(email);

  // Same message for "no such user" and "wrong password", so attackers can't
  // find out which emails are registered.
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    throw new HttpError(401, "Invalid email or password");
  }

  const { password_hash: _ignored, ...publicUser } = user;
  res.json({ user: publicUser, token: signToken(user.id) });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  const user = await findUserById(currentUserId(req));
  if (!user) throw new HttpError(404, "User not found");
  res.json({ user });
});
