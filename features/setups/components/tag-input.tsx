"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface TagInputProps {
  id: string;
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
}

const MAX_TAGS = 20;

/** Enter or comma commits a tag; Backspace on an empty field removes the last. */
export function TagInput({ id, value, onChange, disabled }: TagInputProps) {
  const [draft, setDraft] = useState("");

  const commit = () => {
    const tag = draft.trim().toLowerCase().replace(/,$/, "");
    if (!tag) return;
    if (value.length >= MAX_TAGS) return;
    if (value.includes(tag)) {
      setDraft("");
      return;
    }
    onChange([...value, tag.slice(0, 30)]);
    setDraft("");
  };

  return (
    <div className="flex flex-col gap-2">
      <Input
        id={id}
        value={draft}
        disabled={disabled || value.length >= MAX_TAGS}
        placeholder="liquidity sweep, london open…"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Backspace" && draft === "" && value.length > 0) {
            onChange(value.slice(0, -1));
          }
        }}
      />

      {value.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <li key={tag}>
              <span className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface-raised py-0.5 pl-2.5 pr-1 text-xs text-fg-muted">
                {tag}
                <button
                  type="button"
                  disabled={disabled}
                  aria-label={`Remove tag ${tag}`}
                  onClick={() => onChange(value.filter((item) => item !== tag))}
                  className="rounded-full p-0.5 text-fg-subtle transition-colors hover:bg-surface-hover hover:text-fg"
                >
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
