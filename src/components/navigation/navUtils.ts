/**
 * Navigation routing helpers
 * Distinguishes between Exam Practice (Luyện đề) and Skill Practice (Luyện tập kỹ năng).
 */

/**
 * Returns true if the pathname corresponds to Exam Practice (Luyện đề),
 * such as the exam catalog (/practice/quizzes) or any TOEIC test/attempt/result route (/practice/toeic/...).
 * Note: Specific skill practice quizzes (listening, reading) located at /practice/quizzes/[id]
 * or /practice/quizzes/submissions/[id] are Skill Practice, NOT Exam Practice.
 */
export function isExamRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    pathname.startsWith("/practice/toeic") ||
    pathname === "/practice/quizzes" ||
    pathname === "/practice/quizzes/"
  );
}

/**
 * Returns true if the pathname corresponds to Skill Practice (Luyện tập kỹ năng),
 * including the practice hub (/practice), individual skills (/practice/listening, /practice/speaking,
 * /practice/reading, /practice/writing, /practice/vocab), skill quiz players (/practice/quizzes/[id]),
 * quiz submissions (/practice/quizzes/submissions/[id]), flashcards, and grammar.
 */
export function isSkillsRoute(pathname: string): boolean {
  if (!pathname) return false;
  return (
    (pathname.startsWith("/practice") && !isExamRoute(pathname)) ||
    pathname.startsWith("/flashcard") ||
    pathname.startsWith("/grammar")
  );
}
