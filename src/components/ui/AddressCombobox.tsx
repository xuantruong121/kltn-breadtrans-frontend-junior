"use client";

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, Check, X, Loader2 } from "lucide-react";
import {
  type AddressItem,
  filterAndRankAddressItems,
  calculateGhostSuggestion,
} from "./addressComboboxLogic";

export interface AddressComboboxProps {
  value: string;
  onChange: (selectedCode: string, selectedName: string) => void;
  options: AddressItem[];
  placeholder?: string;
  disabled?: boolean;
  disabledPlaceholder?: string;
  isLoading?: boolean;
  loadingPlaceholder?: string;
  id?: string;
  accentColor?: "blue" | "amber";
  className?: string;
}

export function AddressCombobox({
  value,
  onChange,
  options = [],
  placeholder = "Chọn hoặc nhập để tìm...",
  disabled = false,
  disabledPlaceholder = "Chưa thể chọn...",
  isLoading = false,
  loadingPlaceholder = "Đang tải dữ liệu...",
  id,
  accentColor = "blue",
  className = "",
}: AddressComboboxProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Find currently selected item based on prop `value` (code)
  const selectedOption = useMemo(
    () => options.find((opt) => opt.code === value),
    [options, value]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);

  // Sync display text with selected option when not actively typing/focused
  useEffect(() => {
    if (!isFocused) {
      setInputText(selectedOption ? selectedOption.name : "");
    }
  }, [selectedOption, isFocused]);

  // Compute filtered items based on current search input
  const filteredItems = useMemo(() => {
    if (!isFocused || !inputText.trim()) {
      return options;
    }
    return filterAndRankAddressItems(options, inputText);
  }, [options, inputText, isFocused]);

  // Compute ghost suggestion (e.g. typing "hồ chí" suggests " Minh")
  const ghostSuggestion = useMemo(() => {
    if (!isFocused || !inputText.trim() || !isOpen) {
      return null;
    }
    return calculateGhostSuggestion(inputText, filteredItems);
  }, [inputText, filteredItems, isFocused, isOpen]);

  const ghostSuffix = ghostSuggestion ? ghostSuggestion.ghostSuffix : "";

  // Scroll active item into view
  useEffect(() => {
    if (highlightIndex >= 0 && listRef.current) {
      const activeEl = listRef.current.children[highlightIndex] as HTMLElement;
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [highlightIndex]);

  // Handle outside click to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setIsFocused(false);
        setHighlightIndex(-1);
        setInputText(selectedOption ? selectedOption.name : "");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedOption]);

  const handleSelect = useCallback(
    (item: AddressItem) => {
      onChange(item.code, item.name);
      setInputText(item.name);
      setIsOpen(false);
      setIsFocused(false);
      setHighlightIndex(-1);
      inputRef.current?.blur();
    },
    [onChange]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(text);
    if (!isOpen) setIsOpen(true);
    setHighlightIndex(0); // auto-highlight the top filtered result
  };

  const handleFocus = () => {
    if (disabled || isLoading) return;
    setIsFocused(true);
    setIsOpen(true);
    setHighlightIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (disabled || isLoading) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        setHighlightIndex(0);
      } else {
        setHighlightIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : prev
        );
      }
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (isOpen && highlightIndex >= 0 && filteredItems[highlightIndex]) {
        handleSelect(filteredItems[highlightIndex]);
      } else if (ghostSuggestion?.matchedItem) {
        handleSelect(ghostSuggestion.matchedItem);
      } else if (isOpen && filteredItems.length > 0) {
        handleSelect(filteredItems[0]);
      }
    } else if (e.key === "Tab" || (e.key === "ArrowRight" && inputRef.current?.selectionStart === inputText.length)) {
      if (ghostSuggestion?.matchedItem) {
        e.preventDefault();
        handleSelect(ghostSuggestion.matchedItem);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setHighlightIndex(-1);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("", "");
    setInputText("");
    setHighlightIndex(-1);
    if (!isOpen) setIsOpen(true);
    inputRef.current?.focus();
  };

  const activeFocusRing =
    accentColor === "amber"
      ? "focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20"
      : "focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20";

  const currentPlaceholder = disabled
    ? disabledPlaceholder
    : isLoading
    ? loadingPlaceholder
    : placeholder;

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {/* Input container */}
      <div
        className={`relative flex items-center w-full border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 rounded-xl transition-all ${
          disabled
            ? "opacity-60 cursor-not-allowed bg-slate-100/60 dark:bg-slate-800/20"
            : `cursor-text ${activeFocusRing}`
        }`}
        onClick={() => {
          if (!disabled && !isLoading) {
            inputRef.current?.focus();
            setIsOpen(true);
          }
        }}
      >
        {/* Ghost text background layer (shows faint gray suggestion text aligned with user typing) */}
        {isFocused && ghostSuffix && (
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none flex items-center px-4 py-2.5 text-sm font-semibold overflow-hidden whitespace-pre select-none"
          >
            <span className="opacity-0">{inputText}</span>
            <span className="text-slate-400 dark:text-slate-500">
              {ghostSuffix}
            </span>
          </div>
        )}

        {/* Foreground editable input */}
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={inputText}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={currentPlaceholder}
          autoComplete="off"
          spellCheck={false}
          className="w-full bg-transparent px-4 py-2.5 text-sm font-semibold text-slate-900 dark:text-slate-100 outline-none pr-16 disabled:cursor-not-allowed placeholder:text-slate-400 dark:placeholder:text-slate-500"
        />

        {/* Action icons (clear button + toggle chevron) */}
        <div className="absolute right-3 flex items-center gap-1.5 pointer-events-auto">
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />
          ) : (
            <>
              {value && !disabled && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors"
                  title="Xóa lựa chọn"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!disabled) {
                    setIsOpen((prev) => !prev);
                    if (!isOpen) inputRef.current?.focus();
                  }
                }}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-md transition-colors"
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-blue-500" : ""
                  }`}
                />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dropdown Popover */}
      {isOpen && !disabled && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in-50 zoom-in-95 duration-150">
          <ul
            ref={listRef}
            role="listbox"
            className="overflow-y-auto max-h-60 py-1 divide-y divide-slate-100/50 dark:divide-slate-800/50 text-sm"
          >
            {filteredItems.length === 0 ? (
              <li className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500 text-center select-none font-medium">
                Không tìm thấy địa chỉ phù hợp
              </li>
            ) : (
              filteredItems.map((item, index) => {
                const isSelected = item.code === value;
                const isHighlighted = index === highlightIndex;

                return (
                  <li
                    key={item.code}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setHighlightIndex(index)}
                    className={`px-4 py-2.5 flex items-center justify-between cursor-pointer transition-colors text-xs font-semibold ${
                      isHighlighted
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                        : "text-slate-700 dark:text-slate-300"
                    } ${
                      isSelected
                        ? "text-blue-600 dark:text-blue-400 font-bold bg-blue-50/60 dark:bg-blue-950/40"
                        : ""
                    }`}
                  >
                    <span className="truncate">{item.name}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-blue-500 flex-shrink-0 ml-2" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
