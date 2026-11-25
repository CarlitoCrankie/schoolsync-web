import { Contact } from "@/components/marketing/Contact";
import { Deployments } from "@/components/marketing/Deployments";
import { Hero } from "@/components/marketing/Hero";
import { HowItWorks } from "@/components/marketing/HowItWorks";
import { SiteFooter } from "@/components/marketing/SiteFooter";
import { SiteHeader } from "@/components/marketing/SiteHeader";
import { Testimonials } from "@/components/marketing/Testimonials";

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main id="top">
        <Hero />
        <HowItWorks />
        <Deployments />
        <Contact />
        <Testimonials />
      </main>
      <SiteFooter />
    </>
  );
}
