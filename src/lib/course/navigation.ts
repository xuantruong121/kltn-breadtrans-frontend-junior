export function courseLessonPath(courseId: number, lessonId: number) {
  return `/my-courses/${courseId}/lessons/${lessonId}`;
}

export function courseReturnPath(courseId: number, lessonId: number) {
  return courseLessonPath(courseId, lessonId);
}

export function withCourseReturn(
  route: string,
  courseId: number,
  lessonId: number,
) {
  if (!route.startsWith("/") || route.startsWith("//")) return route;
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}returnTo=${encodeURIComponent(courseReturnPath(courseId, lessonId))}`;
}

export function withSafeReturnTo(route: string, returnTo: string | null) {
  if (!returnTo || !isSafeCourseReturn(returnTo)) return route;
  const separator = route.includes("?") ? "&" : "?";
  return `${route}${separator}returnTo=${encodeURIComponent(returnTo)}`;
}

export function isSafeCourseReturn(value: string | null) {
  return Boolean(value && /^\/my-courses\/\d+\/lessons\/\d+$/.test(value));
}
