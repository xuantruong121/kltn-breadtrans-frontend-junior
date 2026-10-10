export interface AddressItem {
  code: string;
  name: string;
  divisionType?: string;
}

/**
 * Normalizes Vietnamese string by removing diacritics / tone marks,
 * converting to NFC lowercase for consistent search indexing.
 */
export function removeVietnameseTones(str: string): string {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFC")
    .toLowerCase()
    .trim();
}

/**
 * Strips common Vietnamese administrative unit prefixes (Thành phố, Tỉnh, Phường, Xã, Đặc khu)
 * to allow natural searching by the core administrative name.
 */
export function stripAdministrativePrefix(name: string): string {
  if (!name) return "";
  return name
    .normalize("NFC")
    .replace(/^(Thành phố|Tỉnh|Phường|Xã|Đặc khu)\s+/i, "")
    .trim();
}

export interface GhostSuggestionResult {
  ghostSuffix: string;
  matchedItem: AddressItem;
  completedText: string;
}

/**
 * Calculates ghost text suggestion (faint gray continuation) based on user query
 * and ranked candidate items.
 */
export function calculateGhostSuggestion(
  query: string,
  rankedItems: AddressItem[]
): GhostSuggestionResult | null {
  const trimmedQuery = query.trim().normalize("NFC");
  if (!trimmedQuery || rankedItems.length === 0) return null;

  const normalizedQuery = removeVietnameseTones(trimmedQuery);

  for (const item of rankedItems) {
    const fullName = item.name.normalize("NFC");
    const shortName = stripAdministrativePrefix(fullName);

    const normalizedShort = removeVietnameseTones(shortName);
    const normalizedFull = removeVietnameseTones(fullName);

    // 1. Prefix match against short name (e.g. query "hồ chí", shortName "Hồ Chí Minh")
    if (normalizedShort.startsWith(normalizedQuery)) {
      const sliceIndex = trimmedQuery.length;
      if (sliceIndex <= shortName.length) {
        const suffix = shortName.slice(sliceIndex);
        return {
          ghostSuffix: suffix,
          matchedItem: item,
          completedText: shortName,
        };
      }
    }

    // 2. Prefix match against full name (e.g. query "thành phố hồ", fullName "Thành phố Hồ Chí Minh")
    if (normalizedFull.startsWith(normalizedQuery)) {
      const sliceIndex = trimmedQuery.length;
      if (sliceIndex <= fullName.length) {
        const suffix = fullName.slice(sliceIndex);
        return {
          ghostSuffix: suffix,
          matchedItem: item,
          completedText: fullName,
        };
      }
    }
  }

  return null;
}

/**
 * Filters and ranks address items:
 * 1. Items whose short name starts with query (Highest priority)
 * 2. Items whose full name starts with query (Second priority)
 * 3. Items containing query anywhere (Third priority)
 */
export function filterAndRankAddressItems(
  items: AddressItem[],
  query: string
): AddressItem[] {
  if (!items || items.length === 0) return [];
  const trimmed = query.trim().normalize("NFC");
  if (!trimmed) return items;

  const normQuery = removeVietnameseTones(trimmed);

  const exactShortPrefix: AddressItem[] = [];
  const exactFullPrefix: AddressItem[] = [];
  const containsMatch: AddressItem[] = [];

  for (const item of items) {
    const fullName = item.name.normalize("NFC");
    const shortName = stripAdministrativePrefix(fullName);

    const normShort = removeVietnameseTones(shortName);
    const normFull = removeVietnameseTones(fullName);

    if (normShort.startsWith(normQuery)) {
      exactShortPrefix.push(item);
    } else if (normFull.startsWith(normQuery)) {
      exactFullPrefix.push(item);
    } else if (normShort.includes(normQuery) || normFull.includes(normQuery)) {
      containsMatch.push(item);
    }
  }

  return [...exactShortPrefix, ...exactFullPrefix, ...containsMatch];
}
