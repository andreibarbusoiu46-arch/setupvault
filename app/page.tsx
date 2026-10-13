import { getCurrentUser } from "@/lib/auth";
import { Cta } from "@/features/marketing/components/cta";
import { Faq } from "@/features/marketing/components/faq";
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
import { Testimonials } from "@/features/marketing/components/testimonials";

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
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
        <Testimonials />
        <Faq />
        <Cta />
      </main>

      <Footer />
    </div>
  );
}
