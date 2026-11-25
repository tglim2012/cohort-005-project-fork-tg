import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import * as path from "node:path";
import * as sandcastle from "@ai-hero/sandcastle";
import { noSandbox } from "@ai-hero/sandcastle/sandboxes/no-sandbox";
import type { z } from "zod/v4";
import { claudeAgent, required, writeJson } from "../shared/common";
import { extractionPrompt } from "../shared/extraction-prompt";
import { runWithExtraction } from "../shared/run-with-extraction";
import { diffLines } from "./diff-lines";
import { reviewSchema } from "./review-schema";

const BASE_REF = required("BASE_REF");
// prompt.md tells the agent to write its verdict here; the workflow posts it.
const VERDICT = "/tmp/review-verdict.md";

// The agent fixes and commits, writes the verdict file, and hands back the
// findings it left. The workflow pushes the commits, posts the verdict and
// the inline comments, and marks the PR ready.
const result = await runWithExtraction({
  name: "review",
  agent: claudeAgent(),
  sandbox: noSandbox(),
  logging: { type: "stdout" },
  promptFile: path.join(import.meta.dirname, "prompt.md"),
  promptArgs: {
    PR_NUMBER: required("PR_NUMBER"),
    BRANCH: required("BRANCH"),
    BASE_REF,
  },
  output: sandcastle.Output.object({ tag: "comments", schema: reviewSchema }),
  extractionPrompt: extractionPrompt("comments", reviewSchema),
});

const git = (...args: string[]): string =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

// The diff after the agent's commits: the comments land on that.
const hunks = diffLines(git("diff", `origin/${BASE_REF}...HEAD`));
const { comments: found }: z.infer<typeof reviewSchema> = result.output;
const inDiff = ({ path: file, line }: { path: string; line: number }) =>
  hunks.get(file)?.has(line) ?? false;
const comments = found.filter(inDiff);
const dropped = found.filter((comment) => !inDiff(comment));
for (const { path: file, line } of dropped) {
  console.error(
    `Moving the comment on ${file}:${line} to the verdict: not in the diff.`
  );
}

// The inline comments are the only home of a finding the review left, so the
// verdict points at them instead of repeating them. A comment GitHub cannot
// anchor goes in the verdict whole, or nobody would see it. No verdict file
// means the agent broke: leave it missing so the workflow posts its fallback.
if (existsSync(VERDICT) && readFileSync(VERDICT, "utf8").trim()) {
  writeFileSync(VERDICT, withLeftFindings(readFileSync(VERDICT, "utf8")));
}

function withLeftFindings(verdict: string): string {
  if (found.length === 0) return verdict;
  const lines = ["## Left for you", ""];
  if (comments.length > 0) {
    lines.push(
      `${comments.length} finding${comments.length === 1 ? "" : "s"} left as inline comments, on their lines.`
    );
  }
  for (const { path: file, line, body } of dropped) {
    lines.push("", `**\`${file}:${line}\`** (outside the diff)`, "", body);
  }
  const section = `${lines.join("\n")}\n\n`;
  const rules = verdict.indexOf("## Rules this review wanted");
  return rules === -1
    ? `${verdict.trimEnd()}\n\n${section}`
    : verdict.slice(0, rules) + section + verdict.slice(rules);
}

// The request body for POST /repos/{owner}/{repo}/pulls/{n}/reviews.
writeJson("review-comments.json", {
  commit_id: git("rev-parse", "HEAD").trim(),
  event: "COMMENT",
  body: "The findings this review left for you, on their lines. The verdict is in its own comment.",
  comments: comments.map((comment) => ({ ...comment, side: "RIGHT" })),
});
