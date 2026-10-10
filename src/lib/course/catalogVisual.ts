import type { PublicCourseCard } from "@/lib/api/services/course.service";

const courseCardMediaById: Record<
  number,
  { src: string; fallbackSrc: string; alt: string }
> = {
  1: {
    src: "/images/courses/photos/course-1-foundations.jpg",
    fallbackSrc: "/images/courses/course-1-foundations.svg",
    alt: "Nền tảng tiếng Anh và giao tiếp hằng ngày",
  },
  2: {
    src: "/images/courses/photos/course-2-four-skills.jpg",
    fallbackSrc: "/images/courses/course-2-four-skills.svg",
    alt: "Bốn kỹ năng nghe nói đọc viết tiếng Anh",
  },
  3: {
    src: "/images/courses/photos/course-3-toeic-foundation.jpg",
    fallbackSrc: "/images/courses/course-3-toeic-foundation.svg",
    alt: "Luyện TOEIC Listening và Reading nền tảng",
  },
  4: {
    src: "/images/courses/photos/course-4-toeic-advanced.jpg",
    fallbackSrc: "/images/courses/course-4-toeic-advanced.svg",
    alt: "Chiến lược TOEIC nâng cao và suy luận",
  },
  5: {
    src: "/images/courses/photos/course-5-speaking-writing.jpg",
    fallbackSrc: "/images/courses/course-5-speaking-writing.svg",
    alt: "Luyện Speaking và Writing với microphone và tài liệu",
  },
  6: {
    src: "/images/courses/photos/course-6-four-skills-mastery.jpg",
    fallbackSrc: "/images/courses/course-6-four-skills-mastery.svg",
    alt: "Lộ trình làm chủ bốn kỹ năng TOEIC",
  },
  7: {
    src: "/images/courses/photos/course-7-business-english.jpg",
    fallbackSrc: "/images/courses/course-7-business-english.svg",
    alt: "Giao tiếp tiếng Anh trong môi trường công sở",
  },
  8: {
    src: "/images/courses/photos/course-8-grammar-vocabulary.jpg",
    fallbackSrc: "/images/courses/course-8-grammar-vocabulary.svg",
    alt: "Học ngữ pháp, từ vựng và xây dựng câu tiếng Anh",
  },
};

export function getCourseCardMedia(
  course: Pick<PublicCourseCard, "id" | "learning">,
) {
  const fallback = courseCardMediaById[course.id] ?? courseCardMediaById[1];
  return {
    src: fallback.src,
    fallbackSrc: fallback.fallbackSrc,
    alt: fallback.alt,
  };
}
