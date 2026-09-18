import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Star, Quote, ChevronRight, ChevronLeft, MapPin } from 'lucide-react';
import { TESTIMONIALS } from '../data';

export const Testimonials: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % TESTIMONIALS.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + TESTIMONIALS.length) % TESTIMONIALS.length);
  };

  return (
    <section className="py-24 bg-white overflow-hidden border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
            ثقة عملائنا في كل مكان
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
            آراء وتجارب حقيقية لعملاء الأمين
          </h2>
          <div className="h-1 bg-[#f39c12] w-24 mx-auto mt-5 rounded-full" />
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
            فخورون بثقة مئات العملاء في الفلل والقصور والكمبوندات في كافة أنحاء مصر.
          </p>
        </div>

        {/* Desktop 3-Card Grid */}
        <div className="hidden lg:grid grid-cols-3 gap-8 mb-12">
          {TESTIMONIALS.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 relative flex flex-col justify-between hover:shadow-lg transition-all text-right"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="flex gap-1 text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} size={18} fill="currentColor" />
                    ))}
                  </div>
                  <div className="text-gray-300">
                    <Quote size={28} />
                  </div>
                </div>

                <p className="text-gray-700 text-base leading-relaxed mb-6 font-normal">
                  "{item.review}"
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200/80">
                <h3 className="font-bold text-[#143d6a] text-lg mb-1">{item.name}</h3>
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-[#f39c12]" />
                    {item.location}
                  </span>
                  <span className="bg-white px-2.5 py-1 rounded-full border border-gray-200 text-[#143d6a] font-bold">
                    {item.service}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile & Tablet Slider */}
        <div className="lg:hidden max-w-lg mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-slate-50 p-8 rounded-3xl border border-slate-200/80 text-right shadow-sm"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex gap-1 text-amber-400">
                  {[...Array(TESTIMONIALS[currentIndex].rating)].map((_, i) => (
                    <Star key={i} size={18} fill="currentColor" />
                  ))}
                </div>
                <Quote size={28} className="text-gray-300" />
              </div>

              <p className="text-gray-700 text-base leading-relaxed mb-6">
                "{TESTIMONIALS[currentIndex].review}"
              </p>

              <div className="pt-4 border-t border-gray-200/80">
                <h3 className="font-bold text-[#143d6a] text-lg mb-1">{TESTIMONIALS[currentIndex].name}</h3>
                <div className="flex justify-between items-center text-xs text-gray-500 font-medium">
                  <span className="flex items-center gap-1">
                    <MapPin size={12} className="text-[#f39c12]" />
                    {TESTIMONIALS[currentIndex].location}
                  </span>
                  <span className="bg-white px-2.5 py-1 rounded-full border border-gray-200 text-[#143d6a] font-bold">
                    {TESTIMONIALS[currentIndex].service}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center items-center gap-4 mt-6">
            <button
              onClick={handlePrev}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-[#143d6a] hover:text-white transition-colors"
              aria-label="الرأي السابق"
            >
              <ChevronRight size={20} />
            </button>
            <span className="text-xs font-bold text-gray-400">
              {currentIndex + 1} من {TESTIMONIALS.length}
            </span>
            <button
              onClick={handleNext}
              className="p-2.5 rounded-full bg-slate-100 hover:bg-[#143d6a] hover:text-white transition-colors"
              aria-label="الرأي التالي"
            >
              <ChevronLeft size={20} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
