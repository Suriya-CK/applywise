/**
 * AI routes (need a logged-in user).
 *
 *   POST /api/v1/ai/match   { resume, jobDescription, applicationId? }
 *
 * Asks Claude how well a resume fits a job. If applicationId is given, the
 * score is also saved on that application.
 */
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { requireAuth, currentUserId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { analyzeMatch } from "../services/claude.service";
import { updateApplication } from "../repositories/applications.repo";
import { HttpError } from "../utils/HttpError";

export const aiRouter = Router();
aiRouter.use(requireAuth);

// AI calls cost money, so allow each client only a few per minute.
const aiLimiter = rateLimit({ windowMs: 60_000, limit: 10, standardHeaders: true, legacyHeaders: false });

const matchSchema = z.object({
  resume: z.string().trim().min(50, "Paste your full resume text").max(30000),
  jobDescription: z.string().trim().min(50, "Paste the full job description").max(30000),
  applicationId: z.number().int().positive().optional(),
});

aiRouter.post("/match", aiLimiter, validateBody(matchSchema), async (req, res) => {
  const { resume, jobDescription, applicationId } = req.body as z.infer<typeof matchSchema>;
  const result = await analyzeMatch(resume, jobDescription);

  if (applicationId) {
    const updated = await updateApplication(currentUserId(req), applicationId, {
      match_score: result.score,
      job_description: jobDescription,
    });
    if (!updated) throw new HttpError(404, "Application not found");
  }

  res.json({ result });
});
