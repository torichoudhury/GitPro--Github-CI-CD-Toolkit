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
