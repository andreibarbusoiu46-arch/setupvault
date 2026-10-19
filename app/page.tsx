import { getCurrentUser } from "@/lib/auth";
import { getSiteUrl } from "@/lib/env";
import { Cta } from "@/features/marketing/components/cta";
import { FAQS, Faq } from "@/features/marketing/components/faq";
import { Features } from "@/features/marketing/components/features";
import { Footer } from "@/features/marketing/components/footer";
import { Hero } from "@/features/marketing/components/hero";
import { MarketingNav } from "@/features/marketing/components/marketing-nav";
import { PricingPreview } from "@/features/marketing/components/pricing-preview";
import { ProductPreview } from "@/features/marketing/components/product-preview";
import {
  AiReview,
  Analyze,
  Capture,
  Organize,
} from "@/features/marketing/components/story";
import { BuildingInPublic } from "@/features/marketing/components/building-in-public";

/**
 * Structured data, built from the same arrays the page renders.
 *
 * The FAQ block is the one with a real chance of earning extra space in a
 * result; the application block tells an engine what kind of thing this is and
 * what it costs, which is the question every search for a trading journal is
 * really asking.
 */
function structuredData(origin: string) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        "@id": `${origin}/#app`,
        name: "SetupVault",
        url: origin,
        applicationCategory: "FinanceApplication",
        operatingSystem: "Web",
        description:
          "A searchable library for your own trading setups: the chart, the thesis and the outcome, kept together and findable months later.",
        offers: [
          {
            "@type": "Offer",
            name: "Free",
            price: "0",
            priceCurrency: "EUR",
          },
          {
            "@type": "Offer",
            name: "Pro",
            price: "19",
            priceCurrency: "EUR",
            availability: "https://schema.org/PreOrder",
          },
        ],
      },
      {
        "@type": "FAQPage",
        "@id": `${origin}/#faq`,
        mainEntity: FAQS.map((item) => ({
          "@type": "Question",
          name: item.question,
          acceptedAnswer: { "@type": "Answer", text: item.answer },
        })),
      },
    ],
  };
}

export default async function LandingPage() {
  const user = await getCurrentUser();
  const origin = getSiteUrl();

  return (
    <div className="min-h-dvh">
      <script
        type="application/ld+json"
        // The payload is built here from our own constants, never from input.
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(structuredData(origin)),
        }}
      />

      <MarketingNav isAuthenticated={Boolean(user)} />

      <main id="main">
        <Hero />
        <ProductPreview />

        {/* The product story, in the order a trader actually uses it. */}
        <Capture />
        <Organize />
        <Analyze />
        <AiReview />

        <Features />
        <PricingPreview />
        <BuildingInPublic />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}
