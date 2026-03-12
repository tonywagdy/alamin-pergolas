/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";
import { 
  Hammer, 
  TreePine, 
  Sun, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Instagram, 
  Facebook, 
  Menu, 
  X,
  ArrowLeft,
  CheckCircle2,
  Star,
  MessageCircle,
  Send,
  Bot,
  User
} from 'lucide-react';

// --- Types ---
interface Service {
  id: number;
  title: string;
  description: string;
  icon: React.ReactNode;
  image: string;
}

interface Project {
  id: number;
  title: string;
  category: string;
  image: string;
}

// --- Data ---
const SERVICES: Service[] = [
  {
    id: 1,
    title: "برجولات حدائق",
    description: "تصاميم كلاسيكية وعصرية تضفي لمسة جمالية على حديقتك وتوفر ظلاً مثالياً.",
    icon: <TreePine className="w-8 h-8" />,
    image: "./input_file_0.jpg"
  },
  {
    id: 2,
    title: "برجولات روف",
    description: "استغل مساحة السطح وحولها إلى واحة من الراحة والجمال مع تصاميمنا المبتكرة.",
    icon: <Sun className="w-8 h-8" />,
    image: "./input_file_1.jpg"
  },
  {
    id: 3,
    title: "أسقف ديكورية",
    description: "تركيب أسقف خشبية داخلية وخارجية بتفاصيل فنية دقيقة تعكس الفخامة.",
    icon: <Hammer className="w-8 h-8" />,
    image: "./input_file_2.jpg"
  },
  {
    id: 4,
    title: "صيانة وتجديد",
    description: "خدمات صيانة دورية ودهانات مقاومة للعوامل الجوية للحفاظ على جمال الخشب.",
    icon: <ShieldCheck className="w-8 h-8" />,
    image: "./input_file_3.jpg"
  }
];

const PROJECTS: Project[] = [
  { id: 0, title: "تصميم عصري بإضاءة", category: "برجولات حدائق", image: "./input_file_0.jpg" },
  { id: 1, title: "برجولة خشبية فخمة", category: "برجولات حدائق", image: "./input_file_1.jpg" },
  { id: 2, title: "روف بتصميم هندسي", category: "برجولات روف", image: "./input_file_2.jpg" },
  { id: 3, title: "إضاءة ليلية ساحرة", category: "برجولات حدائق", image: "./input_file_3.jpg" },
  { id: 4, title: "جلسة خارجية مريحة", category: "برجولات حدائق", image: "./input_file_4.jpg" },
  { id: 5, title: "تصميم روف مفتوح", category: "برجولات روف", image: "./input_file_5.jpg" },
  { id: 6, title: "برجولة خشبية كلاسيك", category: "برجولات حدائق", image: "./input_file_6.jpg" },
  { id: 7, title: "أعمال خشبية داخلية", category: "ديكورات خشبية", image: "./input_file_7.jpg" },
  { id: 8, title: "برجولة مودرن", category: "برجولات حدائق", image: "./input_file_8.jpg" },
  { id: 9, title: "تصميم روف متكامل", category: "برجولات روف", image: "./input_file_9.jpg" },
  { id: 10, title: "برجولة حديقة واسعة", category: "برجولات حدائق", image: "./input_file_10.jpg" },
  { id: 11, title: "ديكورات أسقف خشبية", category: "أسقف ديكورية", image: "./input_file_11.jpg" },
  { id: 12, title: "برجولة روف مميزة", category: "برجولات روف", image: "./input_file_12.jpg" },
  { id: 13, title: "تصميم هندسي فريد", category: "برجولات حدائق", image: "./input_file_13.jpg" },
  { id: 14, title: "جلسة روف هادئة", category: "برجولات روف", image: "./input_file_14.jpg" },
  { id: 15, title: "برجولة سداسية", category: "برجولات حدائق", image: "./input_file_15.jpg" },
  { id: 16, title: "أبواب خشبية مودرن", category: "أعمال خشبية", image: "./input_file_16.jpg" },
  { id: 17, title: "برجولة روف مغلقة", category: "برجولات روف", image: "./input_file_17.jpg" },
  { id: 18, title: "جلسة حديقة كلاسيكية", category: "برجولات حدائق", image: "./input_file_18.jpg" },
  { id: 19, title: "برجولة ثمانية فخمة", category: "برجولات حدائق", image: "./input_file_19.jpg" },
  { id: 20, title: "أعمال تجليد حوائط", category: "ديكورات خشبية", image: "./input_file_20.jpg" },
  { id: 22, title: "أرجوحة خشبية", category: "أعمال خشبية", image: "./input_file_22.jpg" },
];

const LOGO_URL = "./input_file_21.png";
const PHONE_NUMBER = "201017919385";

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed w-full z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20 items-center">
          <div className="flex-shrink-0 flex items-center gap-2">
            <img src={LOGO_URL} alt="الأمين للبرجولات" className="h-16 w-auto" referrerPolicy="no-referrer" />
            <span className="text-2xl font-extrabold text-brand-blue tracking-tight hidden sm:block">الأمين للبرجولات</span>
          </div>
          
          <div className="hidden md:block">
            <div className="mr-10 flex items-baseline space-x-8 space-x-reverse">
              <a href="#home" className="text-brand-blue hover:text-brand-orange px-3 py-2 font-semibold transition-colors">الرئيسية</a>
              <a href="#services" className="text-brand-blue hover:text-brand-orange px-3 py-2 font-semibold transition-colors">خدماتنا</a>
              <a href="#gallery" className="text-brand-blue hover:text-brand-orange px-3 py-2 font-semibold transition-colors">أعمالنا</a>
              <a href="#about" className="text-brand-blue hover:text-brand-orange px-3 py-2 font-semibold transition-colors">من نحن</a>
              <a href={`tel:${PHONE_NUMBER}`} className="bg-brand-blue text-white px-6 py-2 rounded-full font-bold hover:bg-brand-orange transition-all shadow-md">اتصل بنا</a>
            </div>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-brand-blue">
              {isOpen ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100 overflow-hidden"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 text-right">
              <a href="#home" onClick={() => setIsOpen(false)} className="block px-3 py-4 text-lg font-medium text-brand-blue border-b border-gray-50">الرئيسية</a>
              <a href="#services" onClick={() => setIsOpen(false)} className="block px-3 py-4 text-lg font-medium text-brand-blue border-b border-gray-50">خدماتنا</a>
              <a href="#gallery" onClick={() => setIsOpen(false)} className="block px-3 py-4 text-lg font-medium text-brand-blue border-b border-gray-50">أعمالنا</a>
              <a href="#about" onClick={() => setIsOpen(false)} className="block px-3 py-4 text-lg font-medium text-brand-blue border-b border-gray-50">من نحن</a>
              <a href={`tel:${PHONE_NUMBER}`} onClick={() => setIsOpen(false)} className="block px-3 py-4 text-lg font-bold text-brand-orange">اتصل بنا</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section id="home" className="relative h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="input_file_0.jpg" 
          alt="الأمين للبرجولات" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-brand-blue/40"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full pt-20 md:pt-0">
        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          whileInView={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-2xl text-white"
        >
          <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
            الأمين للبرجولات <br />
            <span className="text-brand-orange">دقة وأمانة</span> في كل قطعة
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-90 font-light leading-relaxed">
            أهلاً بك! أنا الأمين، متخصص في تحويل مساحتك الخارجية لتحفة فنية خشبية. بشتغل بإيدي وبكل أمانة عشان أطلعلك شغل يعيش معاك العمر كله.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a href="#gallery" className="bg-brand-orange text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-brand-light hover:text-brand-blue transition-all text-center shadow-lg flex items-center justify-center gap-2">
              شوف شغلي <ArrowLeft size={20} />
            </a>
            <a href={`https://wa.me/${PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-md border border-white/30 text-white px-10 py-4 rounded-full text-lg font-bold hover:bg-white hover:text-brand-blue transition-all text-center flex items-center justify-center gap-2">
              كلمنا واتساب <MessageCircle size={20} />
            </a>
          </div>
        </motion.div>
      </div>
      
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce text-white opacity-50">
        <div className="w-6 h-10 border-2 border-white rounded-full flex justify-center pt-2">
          <div className="w-1 h-2 bg-white rounded-full"></div>
        </div>
      </div>
    </section>
  );
};

const Services = () => {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">إيه اللي بنقدمه؟</h2>
          <h3 className="text-4xl md:text-5xl font-extrabold text-brand-blue serif">خدماتنا المتكاملة</h3>
          <div className="w-24 h-1 bg-brand-orange mx-auto mt-6"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {SERVICES.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group bg-sand p-8 rounded-3xl hover:bg-brand-blue hover:text-white transition-all duration-500 shadow-sm hover:shadow-2xl"
            >
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center text-brand-orange mb-6 group-hover:bg-brand-orange group-hover:text-white transition-colors shadow-sm">
                {service.icon}
              </div>
              <h4 className="text-2xl font-bold mb-4">{service.title}</h4>
              <p className="opacity-70 leading-relaxed">
                {service.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Gallery = () => {
  return (
    <section id="gallery" className="py-24 bg-sand">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="text-right">
            <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">معرض الصور</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold text-brand-blue serif">من أعمالنا الحقيقية</h3>
          </div>
          <a href={`https://wa.me/${PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer" className="text-brand-blue font-bold border-b-2 border-brand-blue pb-1 hover:text-brand-orange hover:border-brand-orange transition-all">
            اطلب تصميم زيهم
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className="relative group overflow-hidden rounded-3xl aspect-[4/3] shadow-md"
            >
              <img 
                src={project.image} 
                alt={project.title} 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-blue/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 flex flex-col justify-end p-8 text-white">
                <span className="text-sm font-medium text-brand-light mb-2">{project.category}</span>
                <h4 className="text-2xl font-bold">{project.title}</h4>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const About = () => {
  return (
    <section id="about" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="relative"
          >
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl">
              <img 
                src="input_file_13.jpg" 
                alt="الأمين في العمل" 
                className="w-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-brand-light rounded-full -z-0 opacity-20 blur-3xl"></div>
            <div className="absolute -top-10 -left-10 w-48 h-48 bg-brand-orange rounded-full -z-0 opacity-10 blur-2xl"></div>
            
            <div className="absolute top-10 right-10 glass p-6 rounded-2xl shadow-xl z-20 hidden md:block">
              <div className="flex items-center gap-4">
                <div className="bg-brand-blue text-white p-3 rounded-xl">
                  <Star fill="currentColor" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-brand-blue">خبرة</p>
                  <p className="text-sm text-gray-600">طويلة في السوق</p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
          >
            <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">إحنا مين؟</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold text-brand-blue mb-8 serif">الأمانة هي سر نجاحنا</h3>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              في "الأمين للبرجولات"، مش بس بنركب خشب، إحنا بنبني ثقة. بنهتم بكل مسمار وكل تفصيلة عشان نضمن إنك تستلم شغل يشرفك قدام ضيوفك ويعيش معاك سنين طويلة.
            </p>
            
            <ul className="space-y-4 mb-10">
              {[
                "أخشاب طبيعية درجة أولى معالجة",
                "دقة في المواعيد وتسليم في الوقت",
                "أسعار تنافسية مقابل أعلى جودة",
                "ضمان حقيقي ومتابعة بعد التركيب"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-brand-blue font-semibold">
                  <CheckCircle2 className="text-brand-orange" />
                  {item}
                </li>
              ))}
            </ul>

            <a href={`tel:${PHONE_NUMBER}`} className="inline-block bg-brand-blue text-white px-10 py-4 rounded-full font-bold hover:bg-brand-orange transition-all shadow-lg">
              كلمنا دلوقتي
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: 'برجولة حديقة',
    message: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = `طلب جديد من الموقع:
الاسم: ${formData.name}
الرقم: ${formData.phone}
الخدمة: ${formData.service}
الرسالة: ${formData.message}`;
    
    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/${PHONE_NUMBER}?text=${encodedText}`, '_blank');
  };

  return (
    <section id="contact" className="py-24 bg-brand-blue text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-brand-orange font-bold uppercase tracking-widest mb-4">تواصل معانا</h2>
            <h3 className="text-4xl md:text-5xl font-extrabold mb-8 serif">مستنيين مكالمتك</h3>
            <p className="text-lg opacity-70 mb-12 leading-relaxed">
              لو عندك أي سؤال أو عاوز تعرف تكلفة مشروعك، متترددش تكلمنا. إحنا هنا عشان نساعدك تختار الأنسب ليك.
            </p>

            <div className="space-y-8">
              <div className="flex items-start gap-6">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <Phone className="text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm opacity-50 mb-1">اتصل بينا</p>
                  <p className="text-xl font-bold">{PHONE_NUMBER}</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <MessageCircle className="text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm opacity-50 mb-1">واتساب</p>
                  <p className="text-xl font-bold">{PHONE_NUMBER}</p>
                </div>
              </div>
              <div className="flex items-start gap-6">
                <div className="bg-white/10 p-4 rounded-2xl">
                  <MapPin className="text-brand-orange" />
                </div>
                <div>
                  <p className="text-sm opacity-50 mb-1">الموقع</p>
                  <p className="text-xl font-bold">القاهرة - متاحين في كل المحافظات</p>
                </div>
              </div>
            </div>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-8 md:p-12 text-brand-blue shadow-2xl"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold mb-2">اسمك</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full bg-sand border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-orange outline-none" 
                    placeholder="اكتب اسمك هنا" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold mb-2">رقم تليفونك</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full bg-sand border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-orange outline-none" 
                    placeholder="01xxxxxxxxx" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">عاوز تعمل إيه؟</label>
                <select 
                  value={formData.service}
                  onChange={(e) => setFormData({...formData, service: e.target.value})}
                  className="w-full bg-sand border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-orange outline-none"
                >
                  <option>برجولة حديقة</option>
                  <option>برجولة روف</option>
                  <option>سقف ديكوري</option>
                  <option>أخرى</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold mb-2">رسالتك</label>
                <textarea 
                  rows={4} 
                  value={formData.message}
                  onChange={(e) => setFormData({...formData, message: e.target.value})}
                  className="w-full bg-sand border-none rounded-xl p-4 focus:ring-2 focus:ring-brand-orange outline-none" 
                  placeholder="اكتب اللي في بالك..."
                ></textarea>
              </div>
              <button 
                type="submit"
                className="w-full bg-brand-blue text-white py-5 rounded-xl font-bold text-lg hover:bg-brand-orange transition-all shadow-lg"
              >
                ارسل الطلب
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-brand-blue text-white py-12 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-4">
            <div className="bg-white p-2 rounded-xl shadow-inner">
              <img src={LOGO_URL} alt="الأمين للبرجولات" className="h-12 w-auto" referrerPolicy="no-referrer" />
            </div>
            <span className="text-xl font-bold">الأمين للبرجولات</span>
          </div>
          
          <div className="flex gap-6">
            <a href={`https://wa.me/${PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer" className="bg-white/5 p-3 rounded-full hover:bg-brand-orange transition-colors"><MessageCircle size={20} /></a>
            <a href="https://www.facebook.com/Aminforpergola/" target="_blank" rel="noopener noreferrer" className="bg-white/5 p-3 rounded-full hover:bg-brand-orange transition-colors"><Facebook size={20} /></a>
            <a href="https://www.instagram.com/elamincompany" target="_blank" rel="noopener noreferrer" className="bg-white/5 p-3 rounded-full hover:bg-brand-orange transition-colors"><Instagram size={20} /></a>
          </div>

          <p className="text-sm opacity-50">
            © {new Date().getFullYear()} الأمين للبرجولات. جميع الحقوق محفوظة.
          </p>
        </div>
      </div>
    </footer>
  );
};

const WhatsAppButton = () => {
  return (
    <a 
      href={`https://wa.me/${PHONE_NUMBER}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-8 right-8 z-50 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
    >
      <MessageCircle size={32} />
    </a>
  );
};

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'أهلاً بك في شركة الأمين للبرجولات! أنا مساعدك الذكي، كيف يمكنني مساعدتك اليوم؟' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const systemInstruction = `
        أنت مساعد ذكي لشركة "الأمين للبرجولات" (Al-Amin Pergolas).
        الشركة متخصصة في تصنيع وتركيب البرجولات الخشبية، برجولات الحدائق، برجولات الروف، والأسقف الديكورية.
        صاحب الشركة هو "الأمين".
        رقم التواصل: ${PHONE_NUMBER}.
        الشركة تتميز بالجودة العالية، التصاميم المبتكرة، والالتزام بالمواعيد.
        أجب على أسئلة العملاء بلهجة ودودة واحترافية باللغة العربية.
        إذا سأل العميل عن الأسعار، أخبره أن الأسعار تعتمد على المساحة ونوع الخشب والتصميم، ويفضل التواصل عبر الواتساب أو الهاتف للمعاينة وتحديد السعر بدقة.
      `;

      const result = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: systemInstruction + "\n\nسؤال العميل: " + userMessage }] }
        ]
      });

      const botResponse = result.text || "عذراً، حدث خطأ ما. يرجى المحاولة لاحقاً.";
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (error) {
      console.error("Gemini Error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: "عذراً، أنا غير قادر على الرد حالياً. يمكنك التواصل معنا مباشرة عبر الواتساب." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-8 left-8 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-white rounded-2xl shadow-2xl w-80 sm:w-96 overflow-hidden border border-gray-100 mb-4"
          >
            <div className="bg-brand-blue p-4 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Bot size={24} />
                <span className="font-bold">مساعد الأمين الذكي</span>
              </div>
              <button onClick={() => setIsOpen(false)}><X size={20} /></button>
            </div>

            <div className="h-96 overflow-y-auto p-4 space-y-4 bg-sand/30">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                    msg.role === 'user' 
                      ? 'bg-brand-orange text-white rounded-tr-none' 
                      : 'bg-white text-brand-blue shadow-sm rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-white p-3 rounded-2xl shadow-sm rounded-tl-none">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اسألني أي شيء..."
                className="flex-1 bg-sand border-none rounded-xl px-4 py-2 text-sm outline-none focus:ring-1 focus:ring-brand-orange"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                className="bg-brand-blue text-white p-2 rounded-xl hover:bg-brand-orange transition-colors disabled:opacity-50"
              >
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-brand-blue text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center"
      >
        {isOpen ? <X size={32} /> : <Bot size={32} />}
      </button>
    </div>
  );
};

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Hero />
      <Services />
      <About />
      <Gallery />
      <Contact />
      <Footer />
      <WhatsAppButton />
      <AIChatbot />
    </div>
  );
}
