/**
 * Claude (Anthropic) integration: compares a resume with a job description.
 *
 * We use "structured outputs": we give Claude a Zod schema and the SDK's
 * messages.parse() makes Claude reply with JSON that matches it, then parses it
 * for us. So we get a typed object back, not free text we would have to parse.
 */
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { config } from "../config";
import { HttpError } from "../utils/HttpError";

export const MatchResultSchema = z.object({
  score: z.number().int().min(0).max(100).describe("Overall fit, 0-100"),
  summary: z.string().describe("Two or three sentence verdict"),
  matchingSkills: z.array(z.string()).describe("Skills the resume clearly shows that the job asks for"),
  missingSkills: z.array(z.string()).describe("Skills the job asks for that the resume lacks"),
  suggestions: z.array(z.string()).describe("Concrete, honest ways to improve the resume for this job"),
});

export type MatchResult = z.infer<typeof MatchResultSchema>;

const SYSTEM_PROMPT = `You are an experienced technical recruiter.
Compare the candidate's resume with the job description and assess the fit.
Be honest and specific: only count a skill as matching if the resume gives evidence for it.
Suggestions must never encourage inventing experience the candidate does not have.`;

// Created lazily so the server can start (and tests can run) without an API key.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!config.ANTHROPIC_API_KEY) {
    throw new HttpError(503, "AI matching is not configured: set ANTHROPIC_API_KEY on the server");
  }
  client ??= new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  return client;
}

export async function analyzeMatch(resume: string, jobDescription: string): Promise<MatchResult> {
  const anthropic = getClient();

  try {
    const response = await anthropic.messages.parse({
      model: config.CLAUDE_MODEL,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `<resume>\n${resume}\n</resume>\n\n<job_description>\n${jobDescription}\n</job_description>`,
        },
      ],
      output_config: {
        effort: "low", // a simple comparison doesn't need deep reasoning - faster and cheaper
        format: zodOutputFormat(MatchResultSchema),
      },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      throw new HttpError(502, "The AI could not analyse this input. Please try different text.");
    }
    return response.parsed_output;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (err instanceof Anthropic.RateLimitError) {
      throw new HttpError(429, "AI service is busy, please try again in a moment");
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error:", err.status, err.message);
      throw new HttpError(502, "AI service error");
    }
    throw err;
  }
}
