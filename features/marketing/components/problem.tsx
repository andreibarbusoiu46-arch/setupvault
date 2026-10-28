import {
  ProblemCard,
  type Place,
} from "@/features/marketing/components/problem-card";
import { Reveal } from "@/features/marketing/components/reveal";
import { Section } from "@/features/marketing/components/section";

/**
 * The problem, before any of the product.
 *
 * The page went straight from the headline to the first feature, which asks
 * the reader to supply the problem themselves. Most will not; they will
 * decide the product is a nicer-looking journal and leave.
 *
 * This was the plainest composition on the page on purpose — four hairline
 * rows, no cards, no glass, no tilt — on the argument that it is the one
 * place a reader is asked to read rather than look. That has been overridden
 * deliberately: the four places are now cards that lean towards the cursor,
 * each with a lit sphere standing in for a 3D asset. The layout still carries
 * the argument, and carries it harder — the headline stays pinned while the
 * four places scroll past it, so the claim and its four pieces of evidence
 * are on screen together rather than one after the other.
 *
 * The one thing the restyling must not cost is legibility, since the section
 * is still mostly words. So the cursor light peaks at 14%, the orbs sit in
 * their own column away from the text, and every colour is a token — a
 * section hardcoded to navy with neon borders would read as asked in dark and
 * break outright in light, which this page has shipped once already.
 *
 * Nothing here is a customer statistic. These are second-person descriptions
 * of a condition, not measurements of anybody's behaviour.
 */

const PLACES: Place[] = [
  {
    where: "A screenshots folder",
    what: "Hundreds of PNGs named Screenshot 2026-03-11 at 14.22.11. The trade is in there somewhere.",
    icon: "screenshots",
  },
  {
    where: "A spreadsheet",
    what: "Entry, stop, result. Kept faithfully for three weeks in February, then never again.",
    icon: "spreadsheet",
  },
  {
    where: "A notes app",
    what: "The thesis, written while it mattered — with no chart attached and no way to search it by setup.",
    icon: "notes",
  },
  {
    where: "Your memory",
    what: "Where the pattern actually is, and the only copy of it.",
    icon: "memory",
  },
];

export function Problem() {
  return (
    <Section id="problem" className="border-t border-border">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:items-start lg:gap-20">
        {/* Pinned while the four places scroll past. `self-start` is load
            bearing: a grid item stretches to the row height by default, and a
            stretched item has nothing to stick within. */}
        <Reveal className="lg:sticky lg:top-24 lg:self-start">
          <h2 className="display text-[1.95rem] text-fg sm:text-[2.6rem]">
            Your edge is already
            <br className="hidden sm:block" /> written down. In four
            <br className="hidden sm:block" /> different places.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-fg-muted sm:text-[17px]">
            None of which can compare anything to anything. The work of noticing
            is done — it is the keeping that falls apart, and a pattern you
            cannot query is a pattern you do not have.
          </p>
        </Reveal>

        <div className="flex flex-col gap-4 sm:gap-6">
          {PLACES.map((place, index) => (
            <ProblemCard key={place.where} place={place} index={index} />
          ))}
        </div>
      </div>
    </Section>
  );
}
