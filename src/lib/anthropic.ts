import Anthropic from "@anthropic-ai/sdk";

let _client: Anthropic | null = null;

export function anthropic(): Anthropic {
  if (_client) return _client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local to enable AI features.",
    );
  }
  _client = new Anthropic({ apiKey });
  return _client;
}

export const MODEL = "claude-sonnet-4-6";

// Pull the first text block out of a message response, trimmed.
export function extractText(response: Anthropic.Messages.Message): string {
  for (const block of response.content) {
    if (block.type === "text") return block.text.trim();
  }
  return "";
}

// Parse a JSON object from Claude's output. Tolerates ```json fences.
export function parseJsonish<T>(raw: string): T {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  }
  // If there's prose before/after the JSON, grab the outermost braces.
  const first = s.indexOf("{");
  const last = s.lastIndexOf("}");
  if (first >= 0 && last > first) s = s.slice(first, last + 1);
  return JSON.parse(s) as T;
}
