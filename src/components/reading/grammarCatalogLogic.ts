import {
  GRAMMAR_CATEGORY_ORDER,
  grammarCategory,
  type GrammarCategory,
} from "../../lib/catalog/displayTitles.ts";
import type { LearningStatus } from "../../lib/practice/catalogFilters.ts";

type TopicLike = {
  id: number;
  totalQuestions: number;
  isCompleted: boolean;
  attemptCount: number;
};

/** Done, tried without completing, or never opened (persisted attempts). */
export function grammarTopicStatus(topic: TopicLike): LearningStatus {
  if (topic.isCompleted) return "COMPLETED";
  return topic.attemptCount > 0 ? "IN_PROGRESS" : "NOT_STARTED";
}

/** Sections in category order; topics keep the API's authored order. */
export function groupGrammarTopics<T extends TopicLike>(topics: T[]) {
  return GRAMMAR_CATEGORY_ORDER.map((category: GrammarCategory) => {
    const inSection = topics.filter((topic) => grammarCategory(topic.id) === category);
    return {
      category,
      topics: inSection,
      questionCount: inSection.reduce((sum, topic) => sum + topic.totalQuestions, 0),
    };
  }).filter((section) => section.topics.length > 0);
}

/**
 * A random topic to practise, preferring ones not yet completed. It opens
 * that topic's normal attempt, so grading, history and rewards are the same
 * as choosing it by hand.
 */
export function pickRandomGrammarTopic<T extends TopicLike>(
  topics: T[],
  random: () => number,
): T | null {
  const pending = topics.filter((topic) => !topic.isCompleted && topic.totalQuestions > 0);
  const pool = pending.length > 0 ? pending : topics.filter((topic) => topic.totalQuestions > 0);
  if (pool.length === 0) return null;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}
