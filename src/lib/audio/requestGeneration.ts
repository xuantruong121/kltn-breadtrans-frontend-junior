/**
 * Identifies the latest audio request for a player instance.
 *
 * A group id alone is not enough: accent or rate can change while the same
 * group is still active. The monotonically increasing generation makes an
 * older response harmless even if its abort arrives too late.
 */
export function nextAudioRequestGeneration(currentGeneration: number): number {
  return currentGeneration + 1;
}

export function isCurrentAudioRequest(
  activeGeneration: number,
  requestGeneration: number,
  activeGroupId: number | null,
  requestedGroupId: number,
): boolean {
  return (
    activeGeneration === requestGeneration && activeGroupId === requestedGroupId
  );
}
