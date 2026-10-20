import { Reveal } from "@/features/marketing/components/reveal";
import { Section } from "@/features/marketing/components/section";

/**
 * The problem, before any of the product.
 *
 * The page went straight from the headline to the first feature, which asks
 * the reader to supply the problem themselves. Most will not; they will decide
 * the product is a nicer-looking journal and leave.
 *
 * The composition is deliberately the plainest on the page — no mockup, no
 * cards, no glass, no tilt. It is the one place a reader is asked to read
 * rather than look, and it earns the showing that follows. The four rows are
 * hairline-divided and sit in their own column because the layout is the
 * argument: the record already exists, in four pieces, in four places.
 *
 * Nothing here is a customer statistic. These are second-person descriptions
 * of a condition, not measurements of anybody's behaviour.
 */

const PLACES = [
  {
    where: "A screenshots folder",
    what: "Hundreds of PNGs named Screenshot 2026-03-11 at 14.22.11. The trade is in there somewhere.",
  },
  {
    where: "A spreadsheet",
    what: "Entry, stop, result. Kept faithfully for three weeks in February, then never again.",
  },
  {
    where: "A notes app",
    what: "The thesis, written while it mattered — with no chart attached and no way to search it by setup.",
  },
  {
    where: "Your memory",
    what: "Where the pattern actually is, and the only copy of it.",
  },
];

export function Problem() {
  return (
    <Section id="problem" className="border-t border-border">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
        <Reveal>
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

        <Reveal delay={0.08}>
          <dl className="lg:pt-2">
            {PLACES.map((place) => (
              <div
                key={place.where}
                className="border-t border-border py-5 first:border-t-0 first:pt-0 lg:py-6"
              >
                <dt className="text-[15px] font-medium tracking-tight text-fg">
                  {place.where}
                </dt>
                <dd className="mt-1.5 max-w-[46ch] text-[14.5px] leading-relaxed text-fg-muted">
                  {place.what}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </Section>
  );
}
