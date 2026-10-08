import React, { useState } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { LOGO_URL, PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePhoneClick = () => {
    trackGAEvent('phone_call_click', { source: 'navbar' });
  };

  return (
    <nav className="fixed w-full z-50 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <a href="#home" className="min-w-0 flex items-center gap-2 sm:gap-3">
            <img
              src={LOGO_URL}
              alt="شعار شركة الأمين للبرجولات"
              width={56}
              height={56}
              className="h-10 sm:h-14 w-auto rounded-lg shrink-0"
              referrerPolicy="no-referrer"
            />
            <div className="flex flex-col">
              <span className="text-lg sm:text-xl md:text-2xl font-black text-[#143d6a] tracking-tight">الأمين للبرجولات</span>
              <span className="text-xs text-gray-500 font-medium hidden sm:block">تصميم وتنفيذ البرجولات والديكورات الخشبية</span>
            </div>
          </a>

          <div className="hidden xl:flex items-center">
            {/* Navigation links with generous spacing */}
            <div className="flex items-center space-x-6 lg:space-x-7 space-x-reverse">
              <a href="#home" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">الرئيسية</a>
              <a href="#services" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">خدماتنا</a>
              <a href="#gallery" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">أعمالنا</a>
              <a href="#steps" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">خطوات العمل</a>
              <a href="#before-after" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">قبل وبعد</a>
              <a href="#about" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">من نحن</a>
              <a href="#contact" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base">طلب عرض سعر</a>
              <a href="#faq" className="text-[#143d6a] hover:text-[#f39c12] font-bold text-sm lg:text-base transition-colors">الأسئلة</a>
            </div>

            {/* Vertical subtle divider separating navigation from action button */}
            <div className="h-7 w-px bg-gray-200 mx-5 lg:mx-6" />

            {/* Prominent CTA phone action button */}
            <a
              href={`tel:+${PHONE_NUMBER_INTL}`}
              onClick={handlePhoneClick}
              className="bg-[#143d6a] text-white px-5 py-2.5 rounded-full font-extrabold hover:bg-[#f39c12] transition-all shadow-md hover:shadow-lg flex items-center gap-2 text-sm whitespace-nowrap cursor-pointer ring-2 ring-[#143d6a]/10 hover:ring-[#f39c12]/30"
              aria-label="اتصل بنا هاتفياً"
            >
              <Phone size={16} />
              <span>{PHONE_NUMBER_LOCAL}</span>
            </a>
          </div>

          <div className="xl:hidden flex shrink-0 items-center gap-1 sm:gap-3">
            <a
              href={`tel:+${PHONE_NUMBER_INTL}`}
              onClick={handlePhoneClick}
              className="min-h-11 min-w-11 flex items-center justify-center p-2.5 bg-amber-50 text-[#143d6a] rounded-full hover:bg-[#f39c12] hover:text-white transition-all shadow-xs border border-amber-200/60"
              aria-label="اتصل بشركة الأمين"
            >
              <Phone size={18} />
            </a>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-[#143d6a] p-2 hover:bg-slate-100 rounded-xl transition-colors focus:outline-none"
              aria-expanded={isOpen} aria-controls="mobile-navigation"
              aria-label={isOpen ? "إغلاق القائمة" : "فتح القائمة الرئيسية"}
            >
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>
        {isOpen && (
          <div
            id="mobile-navigation" className="xl:hidden bg-white border-t border-gray-100 overflow-hidden shadow-lg"
          >
            <div className="max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain px-4 pt-2 pb-6 space-y-2 text-right">
              <a href="#home" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">الرئيسية</a>
              <a href="#services" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">خدماتنا</a>
              <a href="#gallery" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">أعمالنا الحقيقية</a>
              <a href="#steps" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">خطوات الشغل</a>
              <a href="#before-after" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">قبل وبعد</a>
              <a href="#about" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">من نحن</a>
              <a href="#faq" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">الأسئلة الشائعة</a>
              <a href="#contact" onClick={() => setIsOpen(false)} className="block py-2.5 text-base font-bold text-[#143d6a] border-b border-gray-50">طلب معاينة مجانية</a>

              <div className="pt-2">
                <a
                  href={`tel:+${PHONE_NUMBER_INTL}`}
                  onClick={() => {
                    handlePhoneClick();
                    setIsOpen(false);
                  }}
                  className="w-full bg-[#143d6a] text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <Phone size={18} />
                  <span>اتصل بنا: {PHONE_NUMBER_LOCAL}</span>
                </a>
              </div>
            </div>
          </div>
        )}
    </nav>
  );
};
