"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2Icon } from "lucide-react";

type Option = { id: string; name: string };

type Props = {
  id?: string;
  options: Option[];
  value?: string;
  onChange: (id?: string) => void;
  placeholder?: string;
  allowEmpty?: boolean;
  isLoading?: boolean;
  onInput?: (q: string) => void;
  disabled?: boolean;
  className?: string;
};

export default function Combobox({ id, options, value, onChange, placeholder, allowEmpty = true, isLoading, onInput, disabled = false, className }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const filtered = query
    ? options.filter((o) => o.name.toLowerCase().includes(query.toLowerCase()))
    : options;

  const selected = options.find((o) => o.id === value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    // sync input text with selected value
    if (selected) setQuery(selected.name);
    else if (!open) setQuery("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selected]);

  function selectOption(id?: string) {
    onChange(id);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlightIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const opt = filtered[highlightIndex];
      // if (opt) selectOption(opt.id); // If user just types and hits enter without selecting, maybe we should select current exact match?
      // Logic below: if highlighting and open, select it.
      if (open && opt) {
        selectOption(opt.id);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
    }
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center gap-2">
        <input
          id={id}
          ref={inputRef}
          className={`w-full p-2 border rounded ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''} ${className || ''}`}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            if (disabled) return;
            const val = e.target.value;
            setQuery(val);
            setOpen(true);
            setHighlightIndex(0);
            if (val === "" && allowEmpty) onChange(""); // Clear value if empty
            if (typeof onInput === 'function') onInput(val);
          }}
          onFocus={() => { if (disabled) return; setOpen(true); }}
          onKeyDown={onKeyDown}
          aria-expanded={open}
          disabled={disabled}
          autoComplete="off"
        />
        {isLoading && <Loader2Icon className="animate-spin size-4 text-gray-600" />}
      </div>

      {open && (
        <div className="absolute left-0 right-0 mt-1 max-h-56 overflow-auto border rounded bg-white shadow-md z-50">
          {filtered.length === 0 ? (
            query && onInput ? (
              <div
                className="px-2 py-2 cursor-pointer hover:bg-slate-100 text-blue-600 font-medium"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(query); // Treat the query as the ID/Value
                  setOpen(false);
                }}
              >
                + Buat "{query}"
              </div>
            ) : (
              <div className="p-2 text-sm text-muted-foreground">No results</div>
            )
          ) : (
            filtered.map((o, idx) => (
              <div
                key={o.id}
                className={`px-2 py-2 cursor-pointer hover:bg-slate-100 ${idx === highlightIndex ? 'bg-slate-100' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); selectOption(o.id); }}
                onMouseEnter={() => setHighlightIndex(idx)}
              >
                {o.name}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
