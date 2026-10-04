import Navbar from '../components/landing/Navbar'
import HeroSection from '../components/landing/HeroSection'
import ServicesSection from '../components/landing/ServicesSection'
import PricingSection from '../components/landing/PricingSection'
import ProcessSection from '../components/landing/ProcessSection'
import BranchesSection from '../components/landing/BranchesSection'
import FAQSection from '../components/landing/FAQSection'
import Footer from '../components/landing/Footer'

export default function LandingPage() {
  const [catalog, setCatalog] = useState({ branches: [], services: [], loading: true, branchError: '', serviceError: '' })
  const [retry, setRetry] = useState(0)
  const [selectedBranch, setSelectedBranch] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.allSettled([fetchPublicBranches(controller.signal), fetchPublicServices(controller.signal)]).then(([branches, services]) => {
      if (controller.signal.aborted) return
      setCatalog({
        branches: branches.status === 'fulfilled' ? branches.value : [],
        services: services.status === 'fulfilled' ? services.value : [],
        loading: false,
        branchError: branches.status === 'rejected' ? 'Không tải được chi nhánh. Vui lòng thử lại.' : '',
        serviceError: services.status === 'rejected' ? 'Không tải được dịch vụ. Vui lòng thử lại.' : '',
      })
    })
    return () => controller.abort()
  }, [retry])
  const reload = () => {
    setCatalog((prev) => ({ ...prev, branches: [], services: [], loading: true, branchError: '', serviceError: '' }))
    setRetry((value) => value + 1)
  }
  const branchId = catalog.branches.some((branch) => branch.id === Number(selectedBranch)) ? selectedBranch : String(catalog.branches[0]?.id ?? '')
  const priceRows = getPublicPriceRows(catalog.services, catalog.branches, branchId || null)
  return (
    <div className="min-h-screen bg-surface">
      <Navbar />
      <main>
        <HeroSection />
        <ServicesSection services={catalog.services} loading={catalog.loading} error={catalog.serviceError} onRetry={reload} />
        <PricingSection branches={catalog.branches} branchId={branchId} onBranchChange={setSelectedBranch} rows={priceRows} loading={catalog.loading} error={catalog.serviceError || catalog.branchError} onRetry={reload} />
        <ProcessSection />
        <BranchesSection branches={catalog.branches} loading={catalog.loading} error={catalog.branchError} onRetry={reload} />
        <FAQSection />
      </main>
      <Footer />
    </div>
  )
}
import { useEffect, useState } from 'react'
import { fetchPublicBranches, fetchPublicServices, getPublicPriceRows } from '../api/public.catalog.api'
