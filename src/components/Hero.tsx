import React from 'react';
import { ArrowLeft, MessageCircle, Sparkles } from 'lucide-react';
import { PHONE_NUMBER_INTL, trackGAEvent } from '../data';

export const Hero: React.FC<{ kind?: 'roof' | 'garden' }> = ({ kind }) => {
  const handleWhatsAppClick = () => {
    trackGAEvent('whatsapp_click', { source: 'hero' });
  };

  return (
    <section id="home" className="relative min-h-[92vh] flex items-center overflow-hidden bg-[#143d6a] pt-20">
      {/* Background Hero Image - optimized WebP with eager loading for instant LCP */}
      <div className="absolute inset-0 z-0">
        <img
          src={kind === 'roof' ? '/input_file_1.webp' : '/input_file_0.webp'}
          alt="برجولات خشبية فاخرة للحدائق والروفات"
          className="w-full h-full object-cover scale-105"
          fetchPriority="high"
          decoding="sync"
          referrerPolicy="no-referrer"
        />
        {/* Dark Navy Overlay for optimal contrast */}
        <div className="absolute inset-0 bg-gradient-to-l from-[#143d6a]/40 via-[#143d6a]/75 to-[#143d6a]/95"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full py-16 md:py-24">
        <div className="max-w-2xl text-white text-right">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#f39c12]/20 border border-[#f39c12]/40 text-amber-200 font-bold text-xs sm:text-sm mb-6">
            <Sparkles size={16} className="text-[#f39c12] animate-pulse" />
            <span>تصنيع وتركيب بالقاهرة والجيزة والسواحل بأعلى خامات</span>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black mb-6 leading-tight select-none">
            {kind === 'roof' ? 'برجولات روف وأسطح' : kind === 'garden' ? 'برجولات حدائق وفلل' : 'الأمين للبرجولات'} <br />
            <span className="relative inline-block text-[#f39c12]">
              دقة وأمانة
              <span className="absolute bottom-1 right-0 left-0 h-1.5 bg-amber-400/70 rounded-full"></span>
            </span>{" "}
            في كل قطعة خشب
          </h1>

          <p className="text-lg sm:text-xl md:text-2xl mb-10 opacity-95 font-normal leading-relaxed text-gray-100 max-w-xl">
            بنحول مساحتك الخارجية في الروف أو الحديقة لمساحة مريحة بتصميم يناسب احتياجك. خشب طبيعي معالج ضد الشمس والمطر مع ضمان حقيقي على الجودة ومتابعة دورية.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-start">
            <a
              href="#contact" onClick={() => trackGAEvent('quote_request_click', { source: 'hero' })}
              className="bg-[#f39c12] text-[#143d6a] px-9 py-4 rounded-full text-base sm:text-lg font-extrabold hover:bg-amber-600 transition-all text-center shadow-lg hover:shadow-[#f39c12]/30 flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>اطلب عرض سعر لمشروعك</span>
              <ArrowLeft size={20} />
            </a>

            <a
              href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين للبرجولات، أود الاستفسار عن تفاصيل وطلب معاينة مجانية.')}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              className="bg-white/15 backdrop-blur-md border border-white/30 text-white px-8 py-4 rounded-full text-base sm:text-lg font-bold hover:bg-white hover:text-[#143d6a] transition-all text-center flex items-center justify-center gap-2"
            >
              <MessageCircle size={22} className="text-green-400" />
              <span>طلب معاينة مجانية عبر الواتساب</span>
            </a>
          </div>

          {/* Quick trust metrics */}
          <div className="mt-12 pt-8 border-t border-white/15 grid grid-cols-3 gap-4 text-center sm:text-right">
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#f39c12]">حسب المقاس</p>
              <p className="text-xs sm:text-sm text-gray-200">تصميم يناسب مساحتك</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#f39c12]">ضمان حقيقي</p>
              <p className="text-xs sm:text-sm text-gray-200">اسأل عن الشروط والمدة</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-black text-[#f39c12]">خيارات متنوعة</p>
              <p className="text-xs sm:text-sm text-gray-200">خامات وتشطيبات للمشروع</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
