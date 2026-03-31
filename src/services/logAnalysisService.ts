import type { FailureCategory, LogAnalysisResult } from "../types";

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim() || "";
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL?.trim() || "gemini-1.5-flash";

// Strip ANSI escape codes
function stripAnsi(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
}

function normalizeLine(line: string): string {
  return line
    .replace(/^\d{4}-\d{2}-\d{2}T\S+\s+/, "")
    .replace(/^##\[(error|warning|group|endgroup)\]\s*/i, "")
    .trim();
}

interface ErrorPattern {
  pattern: RegExp;
  category: FailureCategory;
}

const PATTERNS: ErrorPattern[] = [
  // Dependency & Module Issues
  { pattern: /Cannot find module/i, category: "dependency_error" },
  { pattern: /ENOENT.*node_modules/i, category: "dependency_error" },
  { pattern: /npm ERR!.*code ERESOLVE/i, category: "dependency_error" },
  { pattern: /ModuleNotFoundError/i, category: "dependency_error" },
  { pattern: /Package subpath .* is not defined/i, category: "dependency_error" },
  
  // Environment & Permission Issues
  { pattern: /permission denied/i, category: "env_missing" },
  { pattern: /EACCES/i, category: "env_missing" },
  { pattern: /The `.+` environment variable is (missing|required)/i, category: "env_missing" },
  { pattern: /API_KEY|TOKEN.*(not set|undefined)/i, category: "env_missing" },
  { pattern: /Secret .* not found/i, category: "env_missing" },
  
  // Test Failures
  { pattern: /undefined is not/i, category: "test_failure" },
  { pattern: /AssertionError/i, category: "test_failure" },
  { pattern: /FAILED.*test/i, category: "test_failure" },
  { pattern: /\d+ (test|spec).*(fail|err)/i, category: "test_failure" },
  { pattern: /expected.*to (equal|be)/i, category: "test_failure" },
  
  // Linting & Code Quality
  { pattern: /Lint(ing)? error/i, category: "lint_error" },
  { pattern: /ESLint/i, category: "lint_error" },
  { pattern: /Parsing error/i, category: "lint_error" },
  { pattern: /husky - pre-commit hook exit with code/i, category: "lint_error" },
  { pattern: /Prettier/i, category: "lint_error" },
  
  // Vite & Modern Tooling
  { pattern: /Vite Error/i, category: "unknown" },
  { pattern: /Failed to resolve import/i, category: "dependency_error" },
  { pattern: /Internal server error.*(vite|postcss)/i, category: "unknown" },
  
  // Generic Fallbacks
  { pattern: /exit code [1-9]/i, category: "unknown" },
  { pattern: /Error:/i, category: "unknown" },
  { pattern: /FAILED/i, category: "unknown" },
];

const FIX_SUGGESTIONS: Record<FailureCategory, string> = {
  dependency_error:
    "A dependency or sub-package is unresolved. Ensure your lock files (package-lock.json/yarn.lock) are synchronized by running `npm install` locally and committing the changes. Check for conflicting peer dependencies.",
  test_failure:
    "Runtime logic or assertion mismatch detected. Execute the test suite locally using `npm test` or `jest` to isolate the failing spec. Review recent changes for regressions in business logic.",
  lint_error:
    "Static analysis or pre-commit hook violation. Run `npm run lint` or `npx eslint --fix .` to resolve style issues. Ensure all files adhere to the project's formatting standards defined in .eslintrc or .prettierrc.",
  env_missing:
    "A required environment variable, GitHub Secret, or vault credential is inaccessible. Verify that the necessary secrets are defined in GitHub Settings (Secrets & Variables -> Actions) and that the workflow can access them.",
  unknown:
    "Non-deterministic execution failure. Analyze the surrounding log lines for memory exhaustion (OOM), network timeouts, or intermittent infrastructure issues. Cross-reference the error code with the platform documentation.",
};

function normalizeCategory(value: string | undefined): FailureCategory {
  switch (value) {
    case "dependency_error":
    case "test_failure":
    case "lint_error":
    case "env_missing":
    case "unknown":
      return value;
    default:
      return "unknown";
  }
}

function findJsonPayload(text: string): string | null {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
    return trimmed;
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    return null;
  }
  return trimmed.slice(start, end + 1);
}

function heuristicAnalysis(lines: string[]): LogAnalysisResult {
  let rootCauseLineIndex = -1;
  let rootCauseLine = "";
  let category: FailureCategory = "unknown";

  // CI logs often end with the most actionable failure context.
  outer: for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (!line) continue;
    for (const { pattern, category: cat } of PATTERNS) {
      if (pattern.test(line)) {
        rootCauseLineIndex = i;
        rootCauseLine = line;
        // Prefer more specific categories over 'unknown'
        if (cat !== "unknown") {
          category = cat;
          break outer;
        } else if (category === "unknown") {
          category = cat;
          // don't break — keep looking for more specific match
        }
      }
    }
    if (rootCauseLineIndex !== -1 && category !== "unknown") break;
  }

  // Fallback to last non-empty line if nothing matched
  if (rootCauseLineIndex === -1) {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].trim()) {
        rootCauseLineIndex = i;
        rootCauseLine = lines[i];
        break;
      }
    }
  }

  return {
    category,
    rootCauseLine,
    rootCauseLineIndex,
    fixSuggestion: FIX_SUGGESTIONS[category],
    lines,
  };
}

function buildPrompt(lines: string[]) {
  const MAX_LINES = 1200;
  const start = Math.max(0, lines.length - MAX_LINES);
  const sliced = lines.slice(start);

  let content = sliced
    .map((line, idx) => `${start + idx}: ${line}`)
    .join("\n");

  const MAX_CHARS = 90000;
  if (content.length > MAX_CHARS) {
    content = content.slice(content.length - MAX_CHARS);
  }

  return [
    "You are an expert CI/CD log analysis assistant.",
    "Given numbered log lines, identify the most likely root cause of failure.",
    "Return ONLY valid JSON with this exact shape:",
    "{\"category\":\"dependency_error|test_failure|lint_error|env_missing|unknown\",\"rootCauseLineIndex\":123,\"rootCauseLine\":\"...\",\"fixSuggestion\":\"...\"}",
    "Rules:",
    "- rootCauseLineIndex must match the numeric line index shown in the logs.",
    "- Use concise, practical fixSuggestion.",
    "- If uncertain, use category=unknown.",
    "\nLOGS:\n",
    content,
  ].join("\n");
}

async function requestGemini(prompt: string, responseMimeType?: string): Promise<string> {
  const body: any = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
    },
  };

  if (responseMimeType) {
    body.generationConfig.responseMimeType = responseMimeType;
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      GEMINI_MODEL
    )}:generateContent?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(`Gemini API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  const text = (data?.candidates ?? [])
    .flatMap((candidate: any) => candidate?.content?.parts ?? [])
    .map((part: any) => part?.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return text;
}

async function aiAnalysis(lines: string[]): Promise<LogAnalysisResult | null> {
  if (!GEMINI_API_KEY) return null;

  const prompt = buildPrompt(lines);

  let raw = "";
  try {
    raw = await requestGemini(prompt, "application/json");
  } catch {
    raw = await requestGemini(prompt);
  }

  const jsonPayload = findJsonPayload(raw);
  if (!jsonPayload) {
    return null;
  }

  const parsed = JSON.parse(jsonPayload) as {
    category?: string;
    rootCauseLineIndex?: number;
    rootCauseLine?: string;
    fixSuggestion?: string;
  };

  const category = normalizeCategory(parsed.category);
  const safeIndex =
    typeof parsed.rootCauseLineIndex === "number" &&
    Number.isFinite(parsed.rootCauseLineIndex)
      ? Math.max(0, Math.min(lines.length - 1, Math.floor(parsed.rootCauseLineIndex)))
      : -1;

  const rootCauseLine =
    (parsed.rootCauseLine ?? "").trim() ||
    (safeIndex >= 0 ? lines[safeIndex] : "") ||
    "(No root cause line identified)";

  return {
    category,
    rootCauseLineIndex: safeIndex,
    rootCauseLine,
    fixSuggestion: parsed.fixSuggestion?.trim() || FIX_SUGGESTIONS[category],
    lines,
  };
}

export async function analyzeLog(rawLog: string): Promise<LogAnalysisResult> {
  const clean = stripAnsi(rawLog);
  const lines = clean.split("\n").map((l) => normalizeLine(l.trimEnd()));

  try {
    const aiResult = await aiAnalysis(lines);
    if (aiResult) {
      return aiResult;
    }
  } catch {
    // Fall through to heuristic analysis when AI call fails.
  }

  return heuristicAnalysis(lines);
}
