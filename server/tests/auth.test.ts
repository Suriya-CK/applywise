/**
 * Tests for the auth routes.
 *
 * vi.mock() swaps the real users repository for fake functions, so these tests
 * run without a database. Supertest sends HTTP requests straight to the app.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { createApp } from "../src/app";
import * as usersRepo from "../src/repositories/users.repo";

vi.mock("../src/repositories/users.repo");
const repo = vi.mocked(usersRepo);

const app = createApp();
const createdAt = new Date("2026-01-01");

beforeEach(() => vi.resetAllMocks());

describe("POST /api/v1/auth/register", () => {
  it("creates a user and returns a token", async () => {
    repo.findUserByEmail.mockResolvedValue(null);
    repo.createUser.mockResolvedValue({ id: 1, name: "Suriya", email: "s@example.com", created_at: createdAt });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Suriya", email: "S@Example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty("password_hash");
    // email is normalised to lower case, and the password is hashed (not stored as-is)
    const [, email, hash] = repo.createUser.mock.calls[0];
    expect(email).toBe("s@example.com");
    expect(hash).not.toBe("password123");
  });

  it("rejects a short password with 400", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Suriya", email: "s@example.com", password: "short" });

    expect(res.status).toBe(400);
    expect(res.body.details.password).toBeDefined();
  });

  it("returns 409 when the email is taken", async () => {
    repo.findUserByEmail.mockResolvedValue({
      id: 1, name: "x", email: "s@example.com", password_hash: "x", created_at: createdAt,
    });

    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Suriya", email: "s@example.com", password: "password123" });

    expect(res.status).toBe(409);
  });
});

describe("POST /api/v1/auth/login", () => {
  it("logs in with the right password", async () => {
    repo.findUserByEmail.mockResolvedValue({
      id: 7, name: "Suriya", email: "s@example.com",
      password_hash: await bcrypt.hash("password123", 4), created_at: createdAt,
    });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "s@example.com", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).not.toHaveProperty("password_hash");
  });

  it("returns 401 for a wrong password", async () => {
    repo.findUserByEmail.mockResolvedValue({
      id: 7, name: "Suriya", email: "s@example.com",
      password_hash: await bcrypt.hash("password123", 4), created_at: createdAt,
    });

    const res = await request(app).post("/api/v1/auth/login").send({ email: "s@example.com", password: "wrong-pass" });
    expect(res.status).toBe(401);
  });
});

describe("GET /api/v1/auth/me", () => {
  it("returns 401 without a token", async () => {
    const res = await request(app).get("/api/v1/auth/me");
    expect(res.status).toBe(401);
  });

  it("returns 401 with a forged token", async () => {
    const res = await request(app).get("/api/v1/auth/me").set("Authorization", "Bearer not.a.real.token");
    expect(res.status).toBe(401);
  });
});
