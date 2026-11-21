import axiosClient from "../axiosClient";
import type { AdminLearningTrack, LearningTrackOption } from "@/lib/learning-path/tracks";

const adminPath = (code: string) => `/admin/learning-tracks/${encodeURIComponent(code)}`;

/** Lĩnh vực: the public list learners pick from, and the admin list with its writes. */
export const learningTrackService = {
  /** Active tracks in the admins' order. No sign-in needed. */
  list: (): Promise<LearningTrackOption[]> => axiosClient.get("/learning-tracks"),
  /** Every track, turned-off ones too, with items per skill and learners. */
  adminList: (): Promise<AdminLearningTrack[]> => axiosClient.get("/admin/learning-tracks"),
  /** The server makes the code from the name when none is given (409 on a duplicate name or code). */
  create: (body: { name: string; code?: string; description?: string }): Promise<AdminLearningTrack> =>
    axiosClient.post("/admin/learning-tracks", body),
  /** Name and description; an empty description clears it. The code never changes. */
  update: (code: string, body: { name?: string; description?: string }): Promise<AdminLearningTrack> =>
    axiosClient.patch(adminPath(code), body),
  /** Every code, each once, in the new order; answers with the whole list. */
  reorder: (codes: string[]): Promise<AdminLearningTrack[]> => axiosClient.put("/admin/learning-tracks/order", { codes }),
  activate: (code: string): Promise<AdminLearningTrack> => axiosClient.post(`${adminPath(code)}/activate`),
  /** 409 for GENERAL. */
  deactivate: (code: string): Promise<AdminLearningTrack> => axiosClient.post(`${adminPath(code)}/deactivate`),
  /** 409 while any item or learner uses the track, and for GENERAL. */
  remove: (code: string): Promise<{ code: string; deleted: true }> => axiosClient.delete(adminPath(code)),
};
