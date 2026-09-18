import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown, HelpCircle, MessageCircle } from 'lucide-react';
import { FAQ_ITEMS, PHONE_NUMBER_INTL, trackGAEvent } from '../data';

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (idx: number) => {
    setOpenIndex(prev => (prev === idx ? null : idx));
  };

  return (
    <section id="faq" className="py-24 bg-slate-50 overflow-hidden border-b border-slate-200/60">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
            إجابات واضحة
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
            الأسئلة الشائعة حول البرجولات والأعمال الخشبية
          </h2>
          <div className="h-1 bg-[#f39c12] w-24 mx-auto mt-5 rounded-full" />
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
            جمعنا لك هنا أهم الأسئلة التي يطرحها عملاؤنا مع إجابات تفصيلية لمساعدتك في اتخاذ القرار الأفضل.
          </p>
        </div>

        <div className="space-y-4 text-right">
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="bg-white rounded-2xl border border-gray-200/80 shadow-xs overflow-hidden transition-all"
              >
                <button
                  type="button"
                  onClick={() => toggleAccordion(index)}
                  className="w-full p-6 text-right flex justify-between items-center gap-4 cursor-pointer hover:bg-slate-50/80 transition-colors"
                  aria-expanded={isOpen}
                >
                  <h3 className="text-base sm:text-lg font-bold text-[#143d6a] flex-1">
                    {item.question}
                  </h3>
                  <span className={`p-2 rounded-full bg-slate-100 text-[#143d6a] transition-transform duration-300 ${
                    isOpen ? 'rotate-180 bg-amber-100 text-[#f39c12]' : ''
                  }`}>
                    <ChevronDown size={18} />
                  </span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden border-t border-gray-100"
                    >
                      <div className="p-6 text-gray-600 text-sm sm:text-base leading-relaxed bg-slate-50/40">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {/* Have more questions? */}
        <div className="mt-12 text-center p-8 bg-white rounded-3xl border border-gray-200 text-right sm:text-center flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-[#143d6a] text-lg">عندك استفسار آخر مش موجود هنا؟</h3>
            <p className="text-sm text-gray-500">فريق الدعم الفني جاهز للرد على كل استفساراتك فوراً.</p>
          </div>
          <a
            href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين، لدي استفسار بخصوص البرجولات والأعمال الخشبية.')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGAEvent('whatsapp_click', { source: 'faq_cta' })}
            className="bg-[#143d6a] hover:bg-[#f39c12] text-white px-7 py-3 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <span>اسألنا على الواتساب</span>
            <MessageCircle size={18} />
          </a>
        </div>
      </div>
    </section>
  );
};
