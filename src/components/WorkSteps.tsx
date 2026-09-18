import React from 'react';
import { motion } from 'motion/react';
import { Ruler, Palette, Hammer, Award, ArrowLeft } from 'lucide-react';
import { WORK_STEPS, PHONE_NUMBER_INTL, trackGAEvent } from '../data';

const getIcon = (name: string) => {
  switch (name) {
    case 'Ruler': return <Ruler className="w-7 h-7" />;
    case 'Palette': return <Palette className="w-7 h-7" />;
    case 'Hammer': return <Hammer className="w-7 h-7" />;
    case 'Award': return <Award className="w-7 h-7" />;
    default: return <Hammer className="w-7 h-7" />;
  }
};

export const WorkSteps: React.FC = () => {
  return (
    <section id="steps" className="py-24 bg-slate-50 overflow-hidden border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
            كيف نعمل معكم؟
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
            خطوات تنفيذ مشروعك من الفكرة حتى التسليم
          </h2>
          <div className="h-1 bg-[#f39c12] w-24 mx-auto mt-5 rounded-full" />
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
            منظومة عمل هندسية دقيقة تضمن لك راحة البال، سرعة الإنجاز، وأعلى معايير الجودة.
          </p>
        </div>

        {/* 4 Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative">
          {WORK_STEPS.map((step, idx) => (
            <motion.div
              key={step.step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.12, duration: 0.5 }}
              className="bg-white p-8 rounded-3xl border border-gray-200/80 shadow-xs relative flex flex-col justify-between hover:shadow-lg transition-all text-right group"
            >
              {/* Step Number Tag */}
              <div className="flex justify-between items-center mb-6">
                <span className="w-12 h-12 rounded-2xl bg-[#143d6a] text-white flex items-center justify-center font-black text-xl shadow-md group-hover:bg-[#f39c12] transition-colors">
                  0{step.step}
                </span>
                <div className="text-[#f39c12] p-2 bg-amber-50 rounded-xl">
                  {getIcon(step.iconName)}
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-[#143d6a] mb-3">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-6">
                  {step.description}
                </p>
              </div>

              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-[#f39c12] rounded-full" 
                  style={{ width: `${(step.step / WORK_STEPS.length) * 100}%` }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Call to action under steps */}
        <div className="mt-16 text-center">
          <a
            href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين، أرغب في حجز موعد للمعاينة المجانية ورفع المقاسات.')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackGAEvent('whatsapp_click', { source: 'work_steps_cta' })}
            className="inline-flex items-center gap-2 bg-[#143d6a] text-white px-9 py-4 rounded-full font-bold text-base hover:bg-[#f39c12] transition-all shadow-md"
          >
            <span>احجز معاينتك المجانية الآن</span>
            <ArrowLeft size={18} />
          </a>
        </div>
      </div>
    </section>
  );
};
