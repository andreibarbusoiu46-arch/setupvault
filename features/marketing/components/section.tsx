import { cn } from "@/lib/utils";

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className={cn("mx-auto w-full max-w-6xl px-5 py-20 sm:px-8 sm:py-24", className)}
    >
      {children}
    </section>
  );
}

export function SectionHeading({
  title,
  description,
  align = "left",
}: {
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" && "mx-auto text-center")}>
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
