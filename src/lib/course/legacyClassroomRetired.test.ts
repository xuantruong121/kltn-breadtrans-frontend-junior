import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/**
 * Classrooms, class enrollment and class tuition are retired (CP60.1): courses
 * are self-paced and unlocked by PRO. This guard fails when source code calls
 * a retired classroom or tuition API again. It is a regression guard, not a
 * proof of absence: it only knows the paths listed here.
 */
const SRC = join(import.meta.dirname, "..", "..");

const RETIRED_API_PATTERNS: Array<[string, RegExp]> = [
  ["/classes API", /axiosClient\.\w+\(\s*[`"']\/classes/],
  ["/courses/classes API", /\/courses\/classes\//],
  ["/courses/assignments API", /\/courses\/(assignments|submissions)\//],
  ["/admin/classes API", /\/admin\/classes/],
  ["/admin/courses/:id/classes API", /\/admin\/courses\/\$\{[^}]+\}\/classes/],
  ["tuition payments API", /[`"']\/(admin\/)?payments(\/me|\/\$\{|["'`])/],
  ["class enrollment API", /\/my-enrollments|\/enroll[`"']/],
  ["tuition field", /tuitionFeeVnd/],
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.ts$/.test(name) ? [path] : [];
  });
}

test("no source file calls a retired classroom or tuition API", () => {
  const hits: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const text = readFileSync(file, "utf8");
    for (const [label, pattern] of RETIRED_API_PATTERNS) {
      if (pattern.test(text)) hits.push(`${relative(SRC, file)}: ${label}`);
    }
  }
  assert.deepEqual(hits, []);
});

test("the guard recognises the retired calls it is meant to catch", () => {
  const samples = [
    'axiosClient.get("/classes")',
    "axiosClient.get(`/courses/classes/${id}`)",
    "`/courses/assignments/${id}/submit`",
    'axiosClient.get("/admin/classes")',
    "`/admin/courses/${courseId}/classes`",
    'axiosClient.get("/payments/me")',
    "`/courses/${courseId}/my-enrollments`",
    "tuitionFeeVnd: 0",
  ];
  for (const sample of samples) {
    assert.ok(
      RETIRED_API_PATTERNS.some(([, pattern]) => pattern.test(sample)),
      sample,
    );
  }
  // Plan purchases keep their PayOS routes.
  assert.ok(
    !RETIRED_API_PATTERNS.some(([, pattern]) =>
      pattern.test("axiosClient.post(`/payments/payos/${intentId}/sync`)"),
    ),
  );
});
