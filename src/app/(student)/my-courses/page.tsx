import { redirect } from "next/navigation";

/**
 * The old learner catalog is retired. Nested /my-courses/:courseId routes
 * remain separate learning/progress surfaces.
 */
export default function MyCoursesPage() {
  redirect("/courses");
}
