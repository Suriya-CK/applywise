import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";
import * as appsRepo from "../src/repositories/applications.repo";

// Mock only the database functions; keep the real STATUSES constant.
vi.mock("../src/repositories/applications.repo", async (importOriginal) => {
  const actual = await importOriginal<typeof appsRepo>();
  return {
    ...actual,
    listApplications: vi.fn(),
    getApplication: vi.fn(),
    createApplication: vi.fn(),
    updateApplication: vi.fn(),
    deleteApplication: vi.fn(),
    countByStatus: vi.fn(),
  };
});
const repo = vi.mocked(appsRepo);

const app = createApp();
const USER_ID = 42;
const auth = { Authorization: `Bearer ${signToken(USER_ID)}` };

const sample: appsRepo.Application = {
  id: 1, user_id: USER_ID, company: "Acme", role: "Full Stack Developer", status: "applied",
  job_description: null, notes: null, applied_on: "2026-11-01", match_score: null,
  created_at: new Date("2026-11-01"), updated_at: new Date("2026-11-01"),
};

beforeEach(() => vi.clearAllMocks());

describe("applications API", () => {
  it("requires authentication", async () => {
    const res = await request(app).get("/api/v1/applications");
    expect(res.status).toBe(401);
  });

  it("lists only the current user's applications", async () => {
    repo.listApplications.mockResolvedValue([sample]);
    const res = await request(app).get("/api/v1/applications?status=applied").set(auth);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(1);
    expect(repo.listApplications).toHaveBeenCalledWith(USER_ID, "applied");
  });

  it("rejects an unknown status filter", async () => {
    const res = await request(app).get("/api/v1/applications?status=hired").set(auth);
    expect(res.status).toBe(400);
  });

  it("creates an application and returns 201", async () => {
    repo.createApplication.mockResolvedValue(sample);
    const res = await request(app)
      .post("/api/v1/applications")
      .set(auth)
      .send({ company: "Acme", role: "Full Stack Developer", status: "applied", applied_on: "2026-11-01" });

    expect(res.status).toBe(201);
    expect(res.body.application.company).toBe("Acme");
  });

  it("validates the body on create", async () => {
    const res = await request(app).post("/api/v1/applications").set(auth).send({ company: "", status: "nope" });

    expect(res.status).toBe(400);
    expect(res.body.details).toHaveProperty("company");
    expect(res.body.details).toHaveProperty("role");
    expect(repo.createApplication).not.toHaveBeenCalled();
  });

  it("returns 404 when updating someone else's (or a missing) application", async () => {
    repo.updateApplication.mockResolvedValue(null);
    const res = await request(app).patch("/api/v1/applications/999").set(auth).send({ status: "offer" });
    expect(res.status).toBe(404);
  });

  it("rejects an empty PATCH body", async () => {
    const res = await request(app).patch("/api/v1/applications/1").set(auth).send({});
    expect(res.status).toBe(400);
  });

  it("deletes and returns 204", async () => {
    repo.deleteApplication.mockResolvedValue(true);
    const res = await request(app).delete("/api/v1/applications/1").set(auth);
    expect(res.status).toBe(204);
  });

  it("rejects a non-numeric id", async () => {
    const res = await request(app).get("/api/v1/applications/abc").set(auth);
    expect(res.status).toBe(400);
  });

  it("returns stats per status", async () => {
    repo.countByStatus.mockResolvedValue({ wishlist: 1, applied: 2, interview: 1, offer: 0, rejected: 0 });
    const res = await request(app).get("/api/v1/applications/stats").set(auth);
    expect(res.status).toBe(200);
    expect(res.body.stats.applied).toBe(2);
  });
});

describe("misc", () => {
  it("health check works", async () => {
    const res = await request(app).get("/health");
    expect(res.body).toEqual({ status: "ok" });
  });

  it("unknown routes return 404 JSON", async () => {
    const res = await request(app).get("/api/v1/nope");
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});
