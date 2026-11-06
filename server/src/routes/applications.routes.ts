/**
 * Job application CRUD routes. All of them need a logged-in user.
 *
 *   GET    /api/v1/applications            list (optional ?status=applied)
 *   GET    /api/v1/applications/stats      counts per status
 *   GET    /api/v1/applications/:id        one application
 *   POST   /api/v1/applications            create        -> 201 Created
 *   PATCH  /api/v1/applications/:id        partial update
 *   DELETE /api/v1/applications/:id        delete        -> 204 No Content
 *
 * REST conventions used here: nouns in URLs, HTTP verbs for actions,
 * meaningful status codes, and PATCH for partial updates (PUT = replace all).
 */
import { Router, type Request } from "express";
import { z } from "zod";
import { requireAuth, currentUserId } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import * as repo from "../repositories/applications.repo";
import { HttpError } from "../utils/HttpError";

export const applicationsRouter = Router();
applicationsRouter.use(requireAuth); // every route below needs a valid token

const dateString = z.iso.date(); // "YYYY-MM-DD"

const createSchema = z.object({
  company: z.string().trim().min(1).max(200),
  role: z.string().trim().min(1).max(200),
  status: z.enum(repo.STATUSES).optional(),
  job_description: z.string().max(20000).nullish(),
  notes: z.string().max(5000).nullish(),
  applied_on: dateString.nullish(),
  match_score: z.number().int().min(0).max(100).nullish(),
});

// For PATCH every field is optional, but at least one must be sent.
const updateSchema = createSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: "Send at least one field to update",
});

const statusQuery = z.enum(repo.STATUSES).optional();

function parseId(req: Request): number {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "id must be a positive integer");
  return id;
}

applicationsRouter.get("/", async (req, res) => {
  const status = statusQuery.safeParse(req.query.status);
  if (!status.success) throw new HttpError(400, `status must be one of: ${repo.STATUSES.join(", ")}`);
  res.json({ applications: await repo.listApplications(currentUserId(req), status.data) });
});

// Must be registered BEFORE "/:id", otherwise Express would treat "stats" as an id.
applicationsRouter.get("/stats", async (req, res) => {
  res.json({ stats: await repo.countByStatus(currentUserId(req)) });
});

applicationsRouter.get("/:id", async (req, res) => {
  const application = await repo.getApplication(currentUserId(req), parseId(req));
  if (!application) throw new HttpError(404, "Application not found");
  res.json({ application });
});

applicationsRouter.post("/", validateBody(createSchema), async (req, res) => {
  const application = await repo.createApplication(currentUserId(req), req.body);
  res.status(201).json({ application });
});

applicationsRouter.patch("/:id", validateBody(updateSchema), async (req, res) => {
  const application = await repo.updateApplication(currentUserId(req), parseId(req), req.body);
  if (!application) throw new HttpError(404, "Application not found");
  res.json({ application });
});

applicationsRouter.delete("/:id", async (req, res) => {
  const deleted = await repo.deleteApplication(currentUserId(req), parseId(req));
  if (!deleted) throw new HttpError(404, "Application not found");
  res.status(204).end();
});
