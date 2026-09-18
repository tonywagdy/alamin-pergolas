import React from 'react';
import { motion } from 'motion/react';
import { TreePine, Sun, Hammer, ShieldCheck, ArrowLeft } from 'lucide-react';
import { PHONE_NUMBER_INTL } from '../data';

const SERVICES_DATA = [
  {
    id: 1,
    title: "برجولات حدائق وفلل",
    description: "تصاميم هرمية وسداسية ومودرن خشبية مقاومة للعوامل الجوية وتوفر ظلاً طبيعياً مميزاً لجلسات الحديقة.",
    icon: <TreePine className="w-8 h-8" />,
    image: "./input_file_0.webp",
    tag: "الأكثر طلباً"
  },
  {
    id: 2,
    title: "برجولات روف وأسطح",
    description: "استغل مساحة السطح وحولها إلى لاونج أو جلسة عائلية دافئة مع سقف شرائح معالج وعوازل مياه الأمطار.",
    icon: <Sun className="w-8 h-8" />,
    image: "./input_file_1.webp",
    tag: "توفير أقصى استغلال"
  },
  {
    id: 3,
    title: "أسقف وتجاليد ديكورية",
    description: "تكسيات جدارية خشبية وتجاليد أسقف داخلية وخارجية بتفاصيل هندسية تضفي لمسة فخامة معمارية.",
    icon: <Hammer className="w-8 h-8" />,
    image: "./input_file_2.webp",
    tag: "تشطيب دقيق"
  },
  {
    id: 4,
    title: "صيانة وتجديد وعزل",
    description: "خدمات صيانة وإعادة دهان دورية بأفضل الزيوت الإيطالية العازلة لإطالة عمر الخشب وحمايته من التسوس.",
    icon: <ShieldCheck className="w-8 h-8" />,
    image: "./input_file_3.webp",
    tag: "ضمان حقيقي"
  }
];

export const Services: React.FC = () => {
  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.12
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.96 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1, 
      transition: { type: "spring", stiffness: 85, damping: 16 } 
    }
  };

  return (
    <section id="services" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
            إيه اللي بنقدمه؟
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
            خدماتنا المتكاملة في الأعمال الخشبية
          </h2>
          <div className="h-1 bg-[#f39c12] w-24 mx-auto mt-5 rounded-full" />
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg">
            نقدم حلولاً متكاملة من التصميم والتفصيل حتى التركيب والصيانة بأسعار منافسة وجودة لا تضاهى.
          </p>
        </div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8"
        >
          {SERVICES_DATA.map((service) => (
            <motion.div
              key={service.id}
              variants={cardVariants}
              whileHover={{ 
                y: -10, 
                boxShadow: "0 20px 35px -10px rgba(20, 61, 106, 0.12)"
              }}
              className="group bg-slate-50 border border-slate-100 p-7 rounded-3xl hover:bg-[#143d6a] hover:text-white transition-all duration-300 shadow-sm relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="bg-white w-14 h-14 rounded-2xl flex items-center justify-center text-[#f39c12] group-hover:bg-[#f39c12] group-hover:text-white transition-colors duration-300 shadow-xs">
                    {service.icon}
                  </div>
                  <span className="text-xs font-bold text-gray-500 group-hover:text-amber-200 bg-white/70 group-hover:bg-white/10 px-3 py-1 rounded-full">
                    {service.tag}
                  </span>
                </div>
                
                <h3 className="text-xl font-bold mb-3 transition-colors duration-300">{service.title}</h3>
                <p className="text-gray-600 group-hover:text-gray-200 text-sm leading-relaxed mb-6">
                  {service.description}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-200/60 group-hover:border-white/15 flex items-center justify-between">
                <a 
                  href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(`مرحباً شركة الأمين للبرجولات، أريد الاستفسار عن خدمة: ${service.title}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs sm:text-sm font-bold text-[#143d6a] group-hover:text-[#f39c12] flex items-center gap-1.5 transition-colors"
                >
                  <span>استفسر عن الخدمة</span>
                  <ArrowLeft size={16} />
                </a>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};
