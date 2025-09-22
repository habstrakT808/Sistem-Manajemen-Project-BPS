import {
  Header,
  HeroSection,
  RoleSelection,
  Features,
  HowItWorks,
  FAQ,
  Contact,
  Footer,
} from "@/components/landing";

export default function LandingPage() {
  return (
    <main className="min-h-screen flex flex-col">
      <Header />
      <HeroSection />
      <RoleSelection />
      <Features />
      <HowItWorks />
      <FAQ />
      <Contact />
      <Footer />
    </main>
  );
}
