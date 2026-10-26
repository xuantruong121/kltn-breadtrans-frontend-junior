export function shouldResetScrollOnPathChange({
  isHistoryNavigation,
}: {
  isHistoryNavigation: boolean;
}): boolean {
  return !isHistoryNavigation;
}
