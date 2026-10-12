import type { PublicCourseCard } from "@/lib/api/services/course.service";

/**
 * Course media is owned by the backend. The catalog only receives a resolved
 * URL from the course API; it must not infer filenames from course IDs.
 */
export function getCourseCardMedia(
  course: Pick<PublicCourseCard, "thumbnail" | "title">,
) {
  return {
    src: course.thumbnail,
    fallbackSrc: null,
    alt: `Ảnh đại diện khóa học ${course.title}`,
  };
}
