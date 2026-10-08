export type DictionaryEntryLike = {
  word: string;
  partOfSpeech: string | null;
  ipaUs: string | null;
  ipaUk: string | null;
  meaningVi: string | null;
  definitions: Array<{ definition: string; meaningVi: string | null; example: string | null }>;
  examples: string[];
  collocations?: unknown[];
  synonyms: string[];
  antonyms: string[];
  audio: { us: string | null; uk: string | null };
  exampleVi?: string | null;
};

const posKey = (entry: DictionaryEntryLike) =>
  (entry.partOfSpeech || "").trim().toLowerCase();

/** Keep curated data authoritative while adding richer provider definitions. */
export function mergeDictionaryEntries<T extends DictionaryEntryLike>(
  localEntries: T[],
  expandedEntries: T[],
): T[] {
  if (!expandedEntries.length) return localEntries;
  const mergedLocal = localEntries.map((local) => {
    const expanded = expandedEntries.find((entry) => posKey(entry) === posKey(local));
    if (!expanded) return local;
    const mergedAudioUs = local.audio.us || expanded.audio.us || null;
    const mergedAudioUk = local.audio.uk || expanded.audio.uk || null;
    const hasDuplicatedAccentAudio =
      mergedAudioUs && mergedAudioUk && mergedAudioUs === mergedAudioUk;
    return {
      ...expanded,
      ...local,
      word: local.word || expanded.word,
      meaningVi: local.meaningVi || expanded.meaningVi || null,
      exampleVi: local.exampleVi || expanded.exampleVi || null,
      ipaUs: local.ipaUs || expanded.ipaUs || null,
      ipaUk: local.ipaUk || expanded.ipaUk || null,
      definitions: expanded.definitions?.length ? expanded.definitions : local.definitions,
      examples: expanded.examples?.length ? expanded.examples : local.examples,
      collocations: expanded.collocations?.length ? expanded.collocations : local.collocations || [],
      synonyms: expanded.synonyms?.length ? expanded.synonyms : local.synonyms,
      antonyms: expanded.antonyms?.length ? expanded.antonyms : local.antonyms,
      audio: {
        us: hasDuplicatedAccentAudio ? null : mergedAudioUs,
        uk: hasDuplicatedAccentAudio ? null : mergedAudioUk,
      },
    } as T;
  });
  const localPos = new Set(localEntries.map(posKey));
  return [
    ...mergedLocal,
    ...expandedEntries.filter((entry) => !localPos.has(posKey(entry))),
  ];
}

export function selectSpeechVoice(
  voices: SpeechSynthesisVoice[],
  accent: "US" | "UK",
): SpeechSynthesisVoice | null {
  const locale = accent === "US" ? "en-US" : "en-GB";
  return (
    voices.find((voice) => voice.lang.toLowerCase() === locale.toLowerCase()) ||
    voices.find((voice) => voice.lang.toLowerCase().startsWith(`${locale.toLowerCase()}-`)) ||
    null
  );
}
