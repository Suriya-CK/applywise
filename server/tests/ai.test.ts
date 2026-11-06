import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { createApp } from "../src/app";
import { signToken } from "../src/middleware/auth";
import * as claude from "../src/services/claude.service";
import * as appsRepo from "../src/repositories/applications.repo";

// We never call the real Claude API in tests: it costs money and is slow/non-deterministic.
vi.mock("../src/services/claude.service", async (importOriginal) => {
  const actual = await importOriginal<typeof claude>();
  return { ...actual, analyzeMatch: vi.fn() };
});
vi.mock("../src/repositories/applications.repo", async (importOriginal) => {
  const actual = await importOriginal<typeof appsRepo>();
  return { ...actual, updateApplication: vi.fn() };
});

const app = createApp();
const auth = { Authorization: `Bearer ${signToken(1)}` };
const longText = "TypeScript Node.js React PostgreSQL AWS Docker ".repeat(3);

const fakeResult: claude.MatchResult = {
  score: 78,
  summary: "Strong backend fit.",
  matchingSkills: ["TypeScript", "Node.js"],
  missingSkills: ["Kubernetes"],
  suggestions: ["Mention CI/CD experience"],
};

beforeEach(() => vi.clearAllMocks());

describe("POST /api/v1/ai/match", () => {
  it("returns Claude's analysis", async () => {
    vi.mocked(claude.analyzeMatch).mockResolvedValue(fakeResult);

    const res = await request(app).post("/api/v1/ai/match").set(auth).send({ resume: longText, jobDescription: longText });

    expect(res.status).toBe(200);
    expect(res.body.result.score).toBe(78);
    expect(appsRepo.updateApplication).not.toHaveBeenCalled();
  });

  it("saves the score on the application when applicationId is given", async () => {
    vi.mocked(claude.analyzeMatch).mockResolvedValue(fakeResult);
    vi.mocked(appsRepo.updateApplication).mockResolvedValue({} as appsRepo.Application);

    const res = await request(app)
      .post("/api/v1/ai/match")
      .set(auth)
      .send({ resume: longText, jobDescription: longText, applicationId: 5 });

    expect(res.status).toBe(200);
    expect(appsRepo.updateApplication).toHaveBeenCalledWith(1, 5, { match_score: 78, job_description: longText.trim() });
  });

  it("rejects text that is too short", async () => {
    const res = await request(app).post("/api/v1/ai/match").set(auth).send({ resume: "hi", jobDescription: "hi" });
    expect(res.status).toBe(400);
    expect(claude.analyzeMatch).not.toHaveBeenCalled();
  });
});

describe("analyzeMatch without an API key", () => {
  it("fails with 503 instead of crashing", async () => {
    const actual = await vi.importActual<typeof claude>("../src/services/claude.service");
    await expect(actual.analyzeMatch("a", "b")).rejects.toMatchObject({ status: 503 });
  });
});
