import React, { useState, useEffect } from 'react';
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
import { AdminPortal } from './components/AdminPortal';

export default function App() {
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

  const handleNavigateToAdmin = () => {
    setIsAdminRoute(true);
    window.location.hash = 'admin';
  };

  // Completely separate standalone Admin Portal
  if (isAdminRoute) {
    return <AdminPortal onBackToPublicSite={handleBackToPublicSite} />;
  }

  // Clean Public Site (Free of any admin widgets or clutter)
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-[#f39c12] selection:text-white" dir="rtl">
      {/* Fixed Navigation */}
      <Navbar />

      {/* Main Sections with Semantic Flow */}
      <main>
        {/* 1. Hero Landing */}
        <Hero />

        {/* 2. Core Services */}
        <Services />

        {/* 3. Real Gallery Showcase with Category Filters & Lightbox */}
        <Gallery />

        {/* 5. Work Steps & Execution Methodology */}
        <WorkSteps />

        {/* 6. Before and After Transformations */}
        <BeforeAfter />

        {/* 7. About Al-Amin with Verifiable Stats & Materials */}
        <About />

        {/* 8. Comprehensive FAQ Accordion */}
        <FAQ />

        {/* 10. Contact Section & Lead Generation Form */}
        <Contact />
      </main>

      {/* Footer with Discreet Admin Link */}
      <Footer onNavigateToAdmin={handleNavigateToAdmin} />

      {/* Interactive Floating Customer Widgets (Clean Customer Experience) */}
      <WhatsAppButton />
    </div>
  );
}
