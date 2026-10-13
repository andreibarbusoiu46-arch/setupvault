import { cn } from "@/lib/utils";

/**
 * Section heading for the landing page. The index and label form the running
 * spine of the story; the chip on the right states what the section is about
 * in one word.
 */
export function SectionHeader({
  index,
  label,
  chip,
  title,
  description,
  className,
}: {
  index?: string;
  label?: string;
  chip?: string;
  title: string;
  description?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-3xl", className)}>
      {index || label || chip ? (
        <div className="mb-5 flex items-center gap-3">
          {index ? (
            <span className="numeric text-xs text-accent">{index}</span>
          ) : null}
          {index && label ? (
            <span className="h-3 w-px bg-border-strong" aria-hidden="true" />
          ) : null}
          {label ? <span className="text-xs text-fg-muted">{label}</span> : null}
          {chip ? (
            <span className="ml-auto rounded-full border border-border px-2.5 py-0.5 text-xs text-fg-subtle">
              {chip}
            </span>
          ) : null}
        </div>
      ) : null}

      <h2 className="text-[1.75rem] font-semibold leading-[1.15] tracking-tight text-fg sm:text-[2.35rem]">
        {title}
      </h2>

      {description ? (
        <p className="mt-4 text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
          {description}
        </p>
      ) : null}
    </div>
  );
}
