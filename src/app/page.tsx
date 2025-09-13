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

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <HeroSection />
        <RoleSelection />
        <Features />
        <HowItWorks />
        <FAQ />
        <Contact />
      </main>
      <Footer />
    </div>
  );
}
