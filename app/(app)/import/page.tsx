import type { Metadata } from "next";

import { CsvImportWizard } from "@/features/import/components/csv-import-wizard";

export const metadata: Metadata = {
  title: "Import trades",
  description: "Bring your trading history in from any broker or platform.",
};

export default function ImportPage() {
  return (
    <div className="py-2">
      <header className="mx-auto mb-8 w-full max-w-4xl">
        <h1 className="display text-[1.6rem] text-fg sm:text-[2rem]">
          Import your history
        </h1>
        <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-fg-muted">
          A CSV from any broker or platform. The columns are matched for you
          where the header makes it certain, and anything the file leaves
          ambiguous is put to you rather than guessed.
        </p>
      </header>

      <CsvImportWizard />
    </div>
  );
}
