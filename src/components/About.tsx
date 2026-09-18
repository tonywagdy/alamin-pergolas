import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Star, Award, Shield, Users, Clock } from 'lucide-react';
import { COMPANY_STATS, PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

const ADVANTAGES = [
  "أخشاب طبيعية درجة أولى معالجة حرارياً ضد التسوس وعوامل الجو",
  "دقة متناهية في المقاسات وتسليم في الموعد المحدد دون أي تأخير",
  "أسعار مباشرة من المصنع والورشة بدون وسطاء أو مصاريف مخفية",
  "ضمان حقيقي على جودة الخشب والتماسك الإنشائي وعزل الدهانات ومتابعة الصيانة"
];

export const About: React.FC = () => {
  return (
    <section id="about" className="py-24 bg-slate-50 overflow-hidden border-y border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual Showcase with stats badge */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative order-2 lg:order-1"
          >
            <div className="relative rounded-3xl overflow-hidden shadow-xl border-4 border-white">
              <img 
                src="./input_file_13.webp" 
                alt="فريق الأمين للبرجولات أثناء تصنيع وتركيب برجولة خشبية" 
                className="w-full h-[450px] object-cover"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#143d6a]/80 via-transparent to-transparent" />
              
              <div className="absolute bottom-6 right-6 left-6 text-white">
                <p className="text-xl font-extrabold mb-1">فريق الأمين للبرجولات</p>
                <p className="text-sm text-gray-200">صناعة مصرية بأيدي محترفة تفخر بالدقة والأمانة</p>
              </div>
            </div>

            {/* Floating Experience Badge */}
            <div className="absolute -top-6 -right-4 sm:-right-6 bg-white p-5 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
              <div className="bg-[#143d6a] text-white p-3 rounded-xl">
                <Award className="w-6 h-6 text-[#f39c12]" />
              </div>
              <div>
                <p className="text-2xl font-black text-[#143d6a] leading-tight">
                  {COMPANY_STATS.yearsOfExperience} سنوات
                </p>
                <p className="text-xs text-gray-500 font-bold">خبرة موثوقة في مصر</p>
              </div>
            </div>

            {/* Secondary Guarantee Badge */}
            <div className="absolute -bottom-6 -left-4 sm:-left-6 bg-white p-4 rounded-2xl shadow-xl border border-gray-100 flex items-center gap-3">
              <div className="bg-amber-50 p-2.5 rounded-xl text-[#f39c12]">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-lg font-black text-[#143d6a] leading-tight">
                  ضمان حقيقي
                </p>
                <p className="text-xs text-gray-500 font-bold">متابعة وصيانة بعد التسليم</p>
              </div>
            </div>
          </motion.div>

          {/* Text Content & Values */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="text-right order-1 lg:order-2"
          >
            <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
              إحنا مين؟
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a] mb-6 leading-tight">
              الأمانة هي سر استمرارنا وسمعتنا في السوق
            </h2>
            <p className="text-base sm:text-lg text-gray-600 mb-8 leading-relaxed">
              في شركة "الأمين للبرجولات"، بنتعامل مع كل مشروع كأنه في بيتنا الخاص. بنختار أجود أخشاب الموسكي والبيتش باين والعزيزي، وبنستخدم دهانات عازلة إيطالية تحمي خشبك من شمس الصيف وأمطار الشتاء لسنوات طويلة.
            </p>
            
            {/* Dynamic Metric Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8 bg-white p-5 rounded-2xl border border-gray-200/60 shadow-xs">
              <div className="p-3">
                <span className="text-3xl font-black text-[#143d6a] block">+{COMPANY_STATS.projectsCompleted}</span>
                <span className="text-xs sm:text-sm text-gray-500 font-semibold">مشروع تم تسليمه بنجاح</span>
              </div>
              <div className="p-3 border-r border-gray-100">
                <span className="text-3xl font-black text-[#f39c12] block">%{COMPANY_STATS.satisfactionRate}</span>
                <span className="text-xs sm:text-sm text-gray-500 font-semibold">نسبة رضا وتوصية العملاء</span>
              </div>
            </div>

            {/* List of advantages */}
            <ul className="space-y-3.5 mb-10">
              {ADVANTAGES.map((item, i) => (
                <li key={i} className="flex items-start gap-3 text-[#143d6a] font-bold text-sm sm:text-base">
                  <span className="bg-amber-100 text-[#f39c12] p-1 rounded-full mt-0.5 flex-shrink-0">
                    <CheckCircle2 size={16} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <div className="flex flex-wrap gap-4 items-center">
              <a 
                href={`tel:${PHONE_NUMBER_INTL}`} 
                onClick={() => trackGAEvent('phone_call_click', { source: 'about' })}
                className="bg-[#143d6a] text-white px-8 py-4 rounded-full font-extrabold text-base hover:bg-[#f39c12] transition-all shadow-md"
              >
                تواصل معنا الآن: {PHONE_NUMBER_LOCAL}
              </a>
              <a 
                href="#contact" 
                className="text-[#143d6a] font-bold text-base hover:text-[#f39c12] underline underline-offset-4"
              >
                احجز معاينة مجانية لمشروعك
              </a>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
