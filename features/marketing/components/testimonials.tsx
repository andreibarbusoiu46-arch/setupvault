import { Section, SectionHeading } from "@/features/marketing/components/section";

/**
 * PLACEHOLDER COPY.
 * These are written examples of the kind of feedback the product is aiming for.
 * Replace every entry with a real, attributable quote before launch — or remove
 * the section. Do not publish invented testimonials.
 */
const TESTIMONIALS = [
  {
    quote:
      "I had six years of screenshots and no way into them. Being able to pull up every failed breakout I have ever taken changed what I work on.",
    name: "Placeholder — replace before launch",
    role: "Futures trader",
  },
  {
    quote:
      "The tagging is the whole thing. Once my strategies had names, it became obvious that two of them were carrying everything.",
    name: "Placeholder — replace before launch",
    role: "FX swing trader",
  },
  {
    quote:
      "It is the first tool that did not try to connect to my broker or sell me signals. It just holds my own work.",
    name: "Placeholder — replace before launch",
    role: "Crypto trader",
  },
];

export function Testimonials() {
  return (
    <Section id="testimonials" className="border-t border-border">
      <SectionHeading title="What early testers keep saying" />

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <figure
            key={testimonial.quote}
            className="rounded-xl border border-border bg-surface p-6"
          >
            <blockquote className="text-sm leading-relaxed text-fg">
              {testimonial.quote}
            </blockquote>
            <figcaption className="mt-5 text-sm text-fg-subtle">
              <span className="text-fg-muted">{testimonial.name}</span>
              <span className="mx-1.5">·</span>
              {testimonial.role}
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
