import type { FailureCategory, LogAnalysisResult } from "../types";

// Strip ANSI escape codes
function stripAnsi(raw: string): string {
  // eslint-disable-next-line no-control-regex
  return raw.replace(/\x1B\[[0-9;]*[mGKHF]/g, "");
}

interface ErrorPattern {
  pattern: RegExp;
  category: FailureCategory;
}

const PATTERNS: ErrorPattern[] = [
  { pattern: /Cannot find module/i, category: "dependency_error" },
  { pattern: /ENOENT/i, category: "dependency_error" },
  { pattern: /npm ERR!/i, category: "dependency_error" },
  { pattern: /ModuleNotFoundError/i, category: "dependency_error" },
  { pattern: /permission denied/i, category: "env_missing" },
  { pattern: /EACCES/i, category: "env_missing" },
  {
    pattern: /The `.+` environment variable is (missing|required)/i,
    category: "env_missing",
  },
  { pattern: /undefined is not/i, category: "test_failure" },
  { pattern: /AssertionError/i, category: "test_failure" },
  { pattern: /FAILED.*test/i, category: "test_failure" },
  { pattern: /\d+ (test|spec).*(fail|err)/i, category: "test_failure" },
  { pattern: /Lint(ing)? error/i, category: "lint_error" },
  { pattern: /ESLint/i, category: "lint_error" },
  { pattern: /Parsing error/i, category: "lint_error" },
  { pattern: /exit code [1-9]/i, category: "unknown" },
  { pattern: /Error:/i, category: "unknown" },
  { pattern: /FAILED/i, category: "unknown" },
];

const FIX_SUGGESTIONS: Record<FailureCategory, string> = {
  dependency_error:
    "A dependency is missing. Run `npm install` (Node) or `pip install -r requirements.txt` (Python) locally and make sure lock files are committed.",
  test_failure:
    "One or more tests failed. Run the test suite locally (`npm test`) to see which assertion is failing and fix the code or update the snapshot.",
  lint_error:
    "A linting rule was violated. Run `npm run lint` locally to see all issues. Use `--fix` flag for auto-fixable rules.",
  env_missing:
    "A required environment variable or secret is missing from your repo / CI environment. Add it under Settings → Secrets & Variables → Actions.",
  unknown:
    "Review the highlighted line and the lines immediately above it for context. Search the error message online for more details.",
};

export function analyzeLog(rawLog: string): LogAnalysisResult {
  const clean = stripAnsi(rawLog);
  const lines = clean.split("\n").map((l) => l.trimEnd());

  let rootCauseLineIndex = -1;
  let rootCauseLine = "";
  let category: FailureCategory = "unknown";

  outer: for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
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
