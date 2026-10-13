import { Plus } from "lucide-react";

import { Section, SectionHeading } from "@/features/marketing/components/section";

const FAQS = [
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
      "Accounts, your profile, settings and the dashboard shell. Saving and searching setups is the feature we are building next, and it is why the free plan exists.",
  },
  {
    question: "Can I get my data out?",
    answer:
      "Yes. It is your record of your own work. Export is part of the library release, and deleting your account removes every row you own.",
  },
  {
    question: "What does it cost?",
    answer:
      "Nothing today. When paid plans arrive, accounts created during early access keep the access they signed up with.",
  },
];

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
