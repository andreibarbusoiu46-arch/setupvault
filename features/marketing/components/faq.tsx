import { Plus } from "lucide-react";

import { Section, SectionHeading } from "@/features/marketing/components/section";

/**
 * Exported so the structured data on the landing page is generated from the
 * same array the page renders. Two copies of an FAQ drift within a release,
 * and then the answer Google shows is one the site no longer gives.
 */
export const FAQS = [
  {
    question: "Is this a trading journal?",
    answer:
      "No. A journal is organised by date and answers what happened. SetupVault is organised by setup and answers which of your patterns works. You can use it as a journal, but that is not what it is built around.",
  },
  {
    question: "Does it connect to my broker?",
    answer:
      "No, and there are no plans to require it. You save the setups you choose to save. Nothing is imported, mirrored or copied from your account.",
  },
  {
    question: "Who can see my setups?",
    answer:
      "Only you. Access is enforced in PostgreSQL with Row Level Security, so the database will not return your rows to another session even if the application asks it to.",
  },
  {
    question: "What is actually available right now?",
    answer:
      "The library is live: saving setups with their screenshots, strategies and tags, search and filters across your whole history, the analytics and trading calendar, the setup score, and AI reviews of how a setup was put together. Paid plans and billing are what we are building next.",
  },
  {
    question: "Can I get my data out?",
    answer:
      "Yes. It is your record of your own work. You can export it whenever you want, and deleting your account removes every row you own.",
  },
  {
    question: "What does it cost?",
    answer:
      "The library is free and stays free, including fifteen AI setup reviews and five chart reads a month. Pro will be 19 euro a month for a much larger monthly allowance plus auto-tagging, price-level extraction, pattern recognition and plain-language search. Billing is not open yet, so every account today is on the free plan.",
  },
] as const;

export function Faq() {
  return (
    <Section id="faq" className="border-t border-border">
      <SectionHeading title="Questions traders ask first" />

      <div className="mt-10 divide-y divide-border border-y border-border">
        {FAQS.map((faq) => (
          <details key={faq.question} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
              {faq.question}
              <Plus
                className="size-4 shrink-0 text-fg-subtle transition-transform duration-200 group-open:rotate-45"
                aria-hidden="true"
              />
            </summary>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-fg-muted">
              {faq.answer}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}
