import React, { useState, useEffect, Suspense } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { Gallery } from './components/Gallery';
import { WorkSteps } from './components/WorkSteps';
import { BeforeAfter } from './components/BeforeAfter';
import { About } from './components/About';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { Footer } from './components/Footer';
import { WhatsAppButton } from './components/WhatsAppButton';
import { MeasurementConsent } from './components/MeasurementConsent';
import { ErrorBoundary } from './components/ErrorBoundary';

// Code-split AdminPortal so public visitors never download admin-only code
const AdminPortal = React.lazy(() => import('./components/AdminPortal'));

function AdminLoadingFallback() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white" dir="rtl">
      <div className="w-10 h-10 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mb-4"></div>
      <p className="text-sm font-bold text-slate-300">جاري تحميل لوحة التحكم الآمنة...</p>
    </div>
  );
}

export default function App() {
  const kind = window.location.pathname === '/roof-pergolas' ? 'roof' : window.location.pathname === '/garden-pergolas' ? 'garden' : undefined;

  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    const path = window.location.pathname;
    const hash = window.location.hash;
    return path.startsWith('/admin') || hash === '#admin';
  });

  useEffect(() => {
    const checkRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      setIsAdminRoute(path.startsWith('/admin') || hash === '#admin');
    };

    window.addEventListener('popstate', checkRoute);
    window.addEventListener('hashchange', checkRoute);

    return () => {
      window.removeEventListener('popstate', checkRoute);
      window.removeEventListener('hashchange', checkRoute);
    };
  }, []);

  const handleBackToPublicSite = () => {
    setIsAdminRoute(false);
    if (window.location.hash === '#admin') {
      window.history.replaceState(null, '', window.location.pathname);
    }
    if (window.location.pathname.startsWith('/admin')) {
      window.history.pushState(null, '', '/');
    }
  };

  // Completely separate standalone Admin Portal (lazy loaded)
  if (isAdminRoute) {
    return (
      <Suspense fallback={<AdminLoadingFallback />}>
        <AdminPortal onBackToPublicSite={handleBackToPublicSite} />
      </Suspense>
    );
  }

  // Clean Public Site (Free of any admin widgets or clutter, protected by ErrorBoundary)
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#f39c12] selection:text-white" dir="rtl">
        {/* Fixed Navigation */}
        <a href="#main-content" className="skip-link">انتقل إلى المحتوى</a>
        <Navbar />

        {/* Main Sections with Semantic Flow */}
        <main id="main-content">
          {/* 1. Hero Landing */}
          <Hero kind={kind} />

          {/* 2. Core Services */}
          {!kind && <Services />}

          {/* 3. Real Gallery Showcase with Category Filters & Lightbox */}
          <Gallery initialCategory={kind === 'roof' ? 'برجولات روف' : kind === 'garden' ? 'برجولات حدائق' : 'الكل'} />

          {/* 5. Work Steps & Execution Methodology */}
          <WorkSteps />

          {/* 6. Before and After Transformations */}
          <BeforeAfter />

          {/* 7. About Al-Amin with Verifiable Stats & Materials */}
          <About />

          {/* 8. Comprehensive FAQ Accordion */}
          <FAQ />

          {/* 10. Contact Section & Lead Generation Form */}
          <Contact initialService={kind === 'roof' ? 'برجولة روف وأسطح' : 'برجولة حديقة وفلل'} />
        </main>

        {/* Clean Public Footer without any admin portal link */}
        <Footer />

        {/* Interactive Floating Customer Widgets (Clean Customer Experience) */}
        <WhatsAppButton />
        <MeasurementConsent />
      </div>
    </ErrorBoundary>
  );
}
