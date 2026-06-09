import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import ServicesSection from '../components/landing/ServicesSection'
import PricingSection from '../components/landing/PricingSection'
import ProcessSection from '../components/landing/ProcessSection'
import BranchesSection from '../components/landing/BranchesSection'
import ReviewsSection from '../components/landing/ReviewsSection'
import AppDownloadSection from '../components/landing/AppDownloadSection'
import FAQSection from '../components/landing/FAQSection'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection />
        <PricingSection />
        <ProcessSection />
        <BranchesSection />
        <ReviewsSection />
        <AppDownloadSection />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
