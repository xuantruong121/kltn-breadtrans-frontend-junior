"use client";

import { useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { vocabService, type SavedWord } from "@/lib/api/services/vocab.service";
import { findSavedWord } from "@/lib/vocab/savedWords";

export const SAVED_WORDS_KEY = ["vocab-saved"] as const;

/**
 * The learner's saved words, shared by the saved page, the flashcard save
 * button and the dictionary popup, so all three agree (owner 2026-11-16).
 * `enabled: false` for a signed-out visitor.
 */
export function useSavedWords(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: SAVED_WORDS_KEY,
    queryFn: vocabService.getSavedWords,
    enabled,
    staleTime: 30_000,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: SAVED_WORDS_KEY });
  const save = useMutation({ mutationFn: (word: string) => vocabService.saveWord(word), onSettled: refresh });
  const remove = useMutation({
    mutationFn: (id: number) => vocabService.removeSavedWord(id),
    // Gone from the list at once; the server confirms on refresh.
    onMutate: (id) => {
      queryClient.setQueryData<SavedWord[]>(SAVED_WORDS_KEY, (old) => old?.filter((w) => w.id !== id));
    },
    onSettled: refresh,
  });
  const words = query.data ?? [];
  const savedFor = useCallback((word: string) => findSavedWord(query.data ?? [], word), [query.data]);
  return {
    words,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    savedFor,
    save: save.mutateAsync,
    remove: remove.mutateAsync,
    busy: save.isPending || remove.isPending,
  };
}
