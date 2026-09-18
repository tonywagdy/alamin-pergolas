import React from 'react';
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
import { AIChatbot } from './components/AIChatbot';
import { AdminPanel } from './components/AdminPanel';

export default function App() {
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

      {/* Footer */}
      <Footer />

      {/* Interactive Floating Widgets */}
      <WhatsAppButton />
      <AIChatbot />
      <AdminPanel />
    </div>
  );
}
