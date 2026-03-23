/**
 * CI Log Parser — strips ANSI codes, identifies root cause lines,
 * and categorizes CI failures.
 */

// ANSI escape code regex
const ANSI_REGEX = /\x1b\[[0-9;]*m/g;

const ERROR_PATTERNS = [
  { pattern: /Error:/i,              category: 'unknown' },
  { pattern: /FAILED/,               category: 'test_failure' },
  { pattern: /exit code \d+/i,       category: 'unknown' },
  { pattern: /Cannot find module/i,  category: 'dependency_error' },
  { pattern: /Module not found/i,    category: 'dependency_error' },
  { pattern: /npm ERR!/i,            category: 'dependency_error' },
  { pattern: /yarn error/i,          category: 'dependency_error' },
  { pattern: /undefined is not/i,    category: 'test_failure' },
  { pattern: /TypeError:/i,          category: 'test_failure' },
  { pattern: /SyntaxError:/i,        category: 'lint_error' },
  { pattern: /Parsing error/i,       category: 'lint_error' },
  { pattern: /ESLint/i,              category: 'lint_error' },
  { pattern: /is not defined/i,      category: 'lint_error' },
  { pattern: /Missing env/i,         category: 'env_missing' },
  { pattern: /environment variable/i,category: 'env_missing' },
  { pattern: /ENOENT/i,              category: 'env_missing' },
  { pattern: /AssertionError/i,      category: 'test_failure' },
  { pattern: /✕|✗|FAIL\s+/,         category: 'test_failure' },
];

const SUGGESTIONS = {
  dependency_error: 'Run `npm install` or check that all required packages are listed in package.json.',
  test_failure:     'Review failing test assertions. Check for null references or unexpected return values.',
  lint_error:       'Fix lint rule violations. Run `npm run lint --fix` for auto-fixable issues.',
  env_missing:      'Ensure all required environment variables are set in your CI secrets.',
  unknown:          'Review the full log output for additional context.',
};

/**
 * Strip ANSI escape codes from a string
 */
function stripAnsi(str) {
  return str.replace(ANSI_REGEX, '');
}

/**
 * Parse raw CI log text and return a structured result
 * @param {string} rawLog
 * @returns {{ category: string, rootCauseLine: string|null, lineNumber: number|null, suggestion: string, lines: string[] }}
 */
function parseLog(rawLog) {
  const cleaned = stripAnsi(rawLog);
  const lines = cleaned.split('\n');

  let rootCauseLine = null;
  let lineNumber = null;
  let category = 'unknown';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    for (const { pattern, category: cat } of ERROR_PATTERNS) {
      if (pattern.test(line)) {
        // Prefer more specific categories (not 'unknown')
        if (category === 'unknown' || cat !== 'unknown') {
          rootCauseLine = line;
          lineNumber = i + 1;
          category = cat;
        }
        break;
      }
    }

    // Stop at first high-confidence match that isn't 'unknown'
    if (rootCauseLine && category !== 'unknown') {
      // Keep scanning to see if a more specific error appears later
      // But cap scan at first 500 lines for performance
      if (i > 500) break;
    }
  }

  return {
    category,
    rootCauseLine: rootCauseLine || null,
    lineNumber: lineNumber || null,
    suggestion: SUGGESTIONS[category] || SUGGESTIONS.unknown,
    totalLines: lines.length,
  };
}

/**
 * Parse a GitHub Actions job step result list for quick summary
 * @param {Array} steps
 * @returns {{ failedStep: string|null, failedStepConclusion: string|null }}
 */
function parseJobSteps(steps = []) {
  const failedStep = steps.find(
    (s) => s.conclusion === 'failure' || s.conclusion === 'timed_out'
  );
  return {
    failedStep: failedStep?.name || null,
    failedStepConclusion: failedStep?.conclusion || null,
  };
}

module.exports = { parseLog, parseJobSteps, stripAnsi };
