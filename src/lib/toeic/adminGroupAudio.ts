/**
 * Migrated TOEIC Listening clips store a private-bucket key in `audioUrl`
 * (the editor saves it back unchanged); the admin API adds a short-lived
 * signed `audioPlaybackUrl` for playing it. Legacy rows hold a playable URL.
 */
export type AdminGroupAudio = {
  audioUrl?: string | null;
  audioPlaybackUrl?: string | null;
};

/** What an <audio> element can play for this group, or null. */
export function groupAudioSrc(group: AdminGroupAudio): string | null {
  return group.audioPlaybackUrl || group.audioUrl || null;
}

/**
 * Preview for the editor field: the signed URL while the field still holds
 * the group's stored value; a new upload or pasted URL plays as itself.
 */
export function formAudioPreviewSrc(
  formValue: string,
  group: AdminGroupAudio | null | undefined,
): string | undefined {
  if (group && formValue && formValue === group.audioUrl && group.audioPlaybackUrl)
    return group.audioPlaybackUrl;
  return undefined;
}
