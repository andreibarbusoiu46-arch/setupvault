"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ImageIcon, Loader2, Upload, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_SCREENSHOT_BYTES,
} from "@/features/setups/constants";
import { cn } from "@/lib/utils";

interface ScreenshotUploaderProps {
  file: File | null;
  existingUrl: string | null;
  uploading?: boolean;
  disabled?: boolean;
  onSelect: (file: File | null) => void;
  onRemoveExisting: () => void;
}

function describe(file: File) {
  const mb = file.size / (1024 * 1024);
  return `${file.name} · ${mb.toFixed(1)} MB`;
}

export function ScreenshotUploader({
  file,
  existingUrl,
  uploading = false,
  disabled = false,
  onSelect,
  onRemoveExisting,
}: ScreenshotUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived from the file rather than stored in state, so there is no render
  // pass where the two disagree. The effect exists only to release the handle.
  const previewUrl = useMemo(
    () => (file ? URL.createObjectURL(file) : null),
    [file],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const accept = useCallback(
    (candidate: File | undefined) => {
      if (!candidate) return;

      if (!ACCEPTED_IMAGE_TYPES.includes(candidate.type)) {
        setError("Use a PNG, JPG or WEBP image.");
        return;
      }
      if (candidate.size > MAX_SCREENSHOT_BYTES) {
        setError("That image is over 5 MB. Try exporting it smaller.");
        return;
      }

      setError(null);
      onSelect(candidate);
    },
    [onSelect],
  );

  const shownUrl = previewUrl ?? existingUrl;

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(",")}
        className="sr-only"
        disabled={disabled}
        aria-label="Choose a screenshot"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          // Allow re-selecting the same file after a removal.
          event.target.value = "";
        }}
      />

      {shownUrl ? (
        <div className="relative overflow-hidden rounded-xl border border-border bg-canvas-subtle">
          <div className="relative aspect-video w-full">
            <Image
              src={shownUrl}
              alt={
                file
                  ? "Preview of the screenshot about to be uploaded"
                  : "Screenshot saved with this setup"
              }
              fill
              unoptimized
              sizes="(max-width: 768px) 100vw, 640px"
              className="object-contain"
            />
          </div>

          {uploading ? (
            <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 text-sm text-white">
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Uploading
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-3 border-t border-border px-3 py-2">
            <p className="truncate text-xs text-fg-muted">
              {file ? describe(file) : "Saved screenshot"}
            </p>
            <div className="flex shrink-0 gap-1.5">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || uploading}
                onClick={() => inputRef.current?.click()}
              >
                Replace
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || uploading}
                aria-label="Remove screenshot"
                onClick={() => {
                  if (file) {
                    onSelect(null);
                  } else {
                    onRemoveExisting();
                  }
                  setError(null);
                }}
              >
                <X aria-hidden="true" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!disabled) accept(event.dataTransfer.files?.[0]);
          }}
          className={cn(
            "flex flex-col items-center justify-center rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
            dragging
              ? "border-accent bg-accent-soft"
              : "border-border-strong bg-canvas-subtle",
            disabled && "opacity-60",
          )}
        >
          <div className="mb-3 flex size-10 items-center justify-center rounded-xl border border-border bg-surface-raised">
            <ImageIcon className="size-4.5 text-fg-subtle" aria-hidden="true" />
          </div>
          <p className="text-sm text-fg">Drop the chart here</p>
          <p className="mt-1 text-xs text-fg-muted">
            PNG, JPG or WEBP, up to 5 MB
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-4"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            <Upload aria-hidden="true" />
            Choose a file
          </Button>
        </div>
      )}

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
