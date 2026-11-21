"use client";

import { useQuery } from "@tanstack/react-query";

import { learningTrackService } from "@/lib/api/services/learningTrack.service";

export const LEARNING_TRACKS_KEY = ["learning-tracks"] as const;
export const ADMIN_LEARNING_TRACKS_KEY = ["admin-learning-tracks"] as const;

/** The active tracks, in the admins' order: onboarding and the goal editor. */
export function useLearningTracks() {
  return useQuery({ queryKey: LEARNING_TRACKS_KEY, queryFn: learningTrackService.list });
}

/**
 * Every track with its usage: the content list filters and card lines, the
 * tag buttons and the Lĩnh vực page.
 */
export function useAdminLearningTracks() {
  return useQuery({ queryKey: ADMIN_LEARNING_TRACKS_KEY, queryFn: learningTrackService.adminList });
}
