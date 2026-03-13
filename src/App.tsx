import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Phone, 
  Mail, 
  MapPin, 
  ChevronLeft, 
  Menu, 
  X, 
  Hammer, 
  Sun, 
  ShieldCheck, 
  Star,
  MessageCircle,
  Send,
  LogIn,
  LogOut,
  Upload,
  ImagePlus,
  Trash2
} from 'lucide-react';

import { db, auth } from './firebase';
import { collection, onSnapshot, addDoc, deleteDoc, setDoc, doc, Timestamp, query, orderBy } from 'firebase/firestore';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// --- Types ---
interface Project {
  id: number | string;
  title: string;
  category: string;
  image: string;
  isFirestore?: boolean;
}

// --- Constants ---
const PHONE_NUMBER = "201201177385";

const SERVICES = [
  {
    title: "برجولات خشبية",
    description: "تصميم وتنفيذ أحدث البرجولات الخشبية للحدائق والأسطح بأجود أنواع الأخشاب المقاومة للعوامل الجوية.",
    icon: <Hammer className="w-8 h-8" />,
    image: "./input_file_0.jpg"
  },
  {
    title: "أسقف ديكورية",
    description: "تركيب أسقف معلقة وديكورية تضفي لمسة جمالية وفخامة للمساحات الداخلية والخارجية.",
    icon: <Sun className="w-8 h-8" />,
    image: "./input_file_1.jpg"
  },
  {
    title: "صيانة وتجديد",
    description: "خدمات متكاملة لصيانة وتجديد البرجولات والأعمال الخشبية لتعود كأنها جديدة.",
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
];

// --- Components ---

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href={`tel:${PHONE_NUMBER}`} className="hidden md:flex items-center gap-2 bg-brand-blue text-white px-6 py-2 rounded-full hover:bg-brand-orange transition-colors font-bold">
              <Phone size={18} />
              <span>اتصل بنا</span>
            </a>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#about" className={`font-bold hover:text-brand-orange transition-colors ${scrolled ? 'text-brand-blue' : 'text-white'}`}>من نحن</a>
            <a href="#gallery" className={`font-bold hover:text-brand-orange transition-colors ${scrolled ? 'text-brand-blue' : 'text-white'}`}>أعمالنا</a>
            <a href="#services" className={`font-bold hover:text-brand-orange transition-colors ${scrolled ? 'text-brand-blue' : 'text-white'}`}>خدماتنا</a>
            <a href="#" className={`font-bold hover:text-brand-orange transition-colors ${scrolled ? 'text-brand-blue' : 'text-white'}`}>الرئيسية</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <h1 className={`text-2xl font-extrabold tracking-tight serif ${scrolled ? 'text-brand-blue' : 'text-white'}`}>الأمين للبرجولات</h1>
            </div>
            <div className="bg-brand-orange p-2 rounded-lg">
              <Hammer className="w-8 h-8 text-white" />
            </div>
          </div>

          <button className="md:hidden text-brand-blue bg-white p-2 rounded-lg" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t border-gray-100"
          >
            <div className="px-4 pt-2 pb-4 space-y-1 text-right">
              <a href="#" className="block px-3 py-2 text-brand-blue font-bold hover:bg-sand rounded-md">الرئيسية</a>
              <a href="#services" className="block px-3 py-2 text-brand-blue font-bold hover:bg-sand rounded-md">خدماتنا</a>
              <a href="#gallery" className="block px-3 py-2 text-brand-blue font-bold hover:bg-sand rounded-md">أعمالنا</a>
              <a href="#about" className="block px-3 py-2 text-brand-blue font-bold hover:bg-sand rounded-md">من نحن</a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <img 
          src="./input_file_2.jpg" 
          alt="برجولة خشبية فخمة" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-blue/90 to-brand-blue/40 mix-blend-multiply"></div>
      </div>
      
      <div className="relative z-10 text-center px-4 max-w-5xl mx-auto mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <span className="inline-block py-1 px-3 rounded-full bg-brand-orange/20 text-brand-orange border border-brand-orange/30 font-bold text-sm mb-6 backdrop-blur-sm">
            الخيار الأول للبرجولات في مصر
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight serif">
            نصنع من الخشب <br/>
            <span className="text-brand-orange">تحفاً فنية</span> لمنزلك
          </h1>
          <p className="text-xl text-gray-200 mb-10 max-w-2xl mx-auto leading-relaxed">
            متخصصون في تصميم وتنفيذ أرقى البرجولات الخشبية والأسقف الديكورية بأعلى معايير الجودة وأفضل أنواع الأخشاب.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#gallery" className="bg-brand-orange text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-brand-orange transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
              شاهد أعمالنا <ChevronLeft size={20} />
            </a>
            <a href={`https://wa.me/${PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-md text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-white hover:text-brand-blue transition-all flex items-center justify-center gap-2">
              تواصل معنا عبر واتساب
            </a>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

const Services = () => {
  return (
    <section id="services" className="py-24 bg-white relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">ماذا نقدم</h2>
          <h3 className="text-4xl md:text-5xl font-extrabold text-brand-blue serif">خدماتنا المتميزة</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {SERVICES.map((service, index) => (
            <motion.div 
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              className="bg-sand rounded-3xl p-8 hover:shadow-xl transition-all duration-300 group border border-gray-100"
            >
              <div className="bg-white w-16 h-16 rounded-2xl flex items-center justify-center text-brand-orange mb-6 shadow-sm group-hover:scale-110 transition-transform">
                {service.icon}
              </div>
              <h4 className="text-2xl font-bold text-brand-blue mb-4 text-right">{service.title}</h4>
              <p className="text-gray-600 text-right leading-relaxed mb-6">
                {service.description}
              </p>
              <div className="rounded-2xl overflow-hidden h-48">
                <img src={service.image} alt={service.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Gallery = () => {
  const [firestoreProjects, setFirestoreProjects] = useState<any[]>([]);
  const [deletedStaticIds, setDeletedStaticIds] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAdmin(!!user);
    });

    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFirestoreProjects(items);
    }, (error) => {
      console.error("Error fetching gallery:", error);
    });

    const qDeleted = query(collection(db, 'deleted_static_images'));
    const unsubscribeDeleted = onSnapshot(qDeleted, (snapshot) => {
      setDeletedStaticIds(snapshot.docs.map(doc => Number(doc.id)));
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeDeleted();
    };
  }, []);

  const handleDelete = async (id: string | number, isFirestore: boolean) => {
    try {
      if (isFirestore) {
        await deleteDoc(doc(db, 'gallery', id as string));
      } else {
        await setDoc(doc(db, 'deleted_static_images', id.toString()), { deleted: true });
      }
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const allProjects = [
    ...firestoreProjects.map(p => ({ id: p.id, title: p.title, category: p.category, image: p.image, isFirestore: true })),
    ...PROJECTS.filter(p => !deletedStaticIds.includes(p.id)).map(p => ({ ...p, isFirestore: false }))
  ];

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
          {allProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ delay: (index % 6) * 0.1 }}
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
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(project.id, project.isFirestore || false)}
                  className="absolute top-4 left-4 bg-red-500 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                  title="حذف الصورة"
                >
                  <Trash2 size={18} />
                </button>
              )}
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
                src="./input_file_4.jpg" 
                alt="ورشة الأمين للبرجولات" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="absolute -bottom-8 -right-8 bg-brand-orange text-white p-8 rounded-3xl shadow-xl z-20 hidden md:block">
              <div className="text-5xl font-extrabold mb-2">+15</div>
              <div className="font-bold text-lg">عاماً من الخبرة</div>
            </div>
          </motion.div>

          <div className="text-right">
            <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">قصتنا</h2>
            <h3 className="text-4xl font-extrabold text-brand-blue mb-6 serif">خبرة تتوارثها الأجيال في صناعة الخشب</h3>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              مؤسسة "الأمين للبرجولات" ليست مجرد ورشة نجارة، بل هي كيان متخصص يجمع بين الفن والهندسة. نحن نؤمن بأن الخشب مادة حية تحتاج إلى أيدٍ خبيرة لتشكيلها وتحويلها إلى تحف فنية تزين منازلكم.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              نستخدم أفضل أنواع الأخشاب المستوردة (البيتش باين، العزيزي، السويدي) المعالجة ضد الشمس والرطوبة، لضمان عمر افتراضي طويل لبرجولتك.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-sand p-4 rounded-2xl border border-gray-100">
                <Star className="text-brand-orange mb-2" />
                <h4 className="font-bold text-brand-blue">جودة مضمونة</h4>
                <p className="text-sm text-gray-500">ضمان على جميع أعمالنا</p>
              </div>
              <div className="bg-sand p-4 rounded-2xl border border-gray-100">
                <Hammer className="text-brand-orange mb-2" />
                <h4 className="font-bold text-brand-blue">تنفيذ دقيق</h4>
                <p className="text-sm text-gray-500">التزام بالمواعيد والمواصفات</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const Contact = () => {
  return (
    <section id="contact" className="py-24 bg-brand-blue text-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-orange rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-light rounded-full blur-3xl transform -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-brand-orange uppercase tracking-widest mb-3">تواصل معنا</h2>
          <h3 className="text-4xl md:text-5xl font-extrabold serif">نحن هنا لخدمتك</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <a href={`https://wa.me/${PHONE_NUMBER}`} target="_blank" rel="noopener noreferrer" className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-center hover:bg-white/20 transition-all group">
            <div className="bg-brand-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Phone className="text-white" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2">اتصل بنا</h4>
            <p className="text-gray-300 dir-ltr">{PHONE_NUMBER}</p>
          </a>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-center hover:bg-white/20 transition-all group">
            <div className="bg-brand-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <MapPin className="text-white" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2">مقرنا</h4>
            <p className="text-gray-300">القاهرة، جمهورية مصر العربية</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl text-center hover:bg-white/20 transition-all group">
            <div className="bg-brand-orange w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
              <Mail className="text-white" size={24} />
            </div>
            <h4 className="text-xl font-bold mb-2">البريد الإلكتروني</h4>
            <p className="text-gray-300">info@alamin-pergolas.com</p>
          </div>
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <Hammer className="text-brand-orange" />
          <span className="text-white font-bold text-xl serif">الأمين للبرجولات</span>
        </div>
        <p className="text-sm">
          جميع الحقوق محفوظة © {new Date().getFullYear()} شركة الأمين للبرجولات
        </p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-brand-orange transition-colors">فيسبوك</a>
          <a href="#" className="hover:text-brand-orange transition-colors">إنستجرام</a>
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
        مقر الشركة: القاهرة، مصر.
        أجب باختصار وبطريقة ودية واحترافية باللغة العربية.
        إذا سأل العميل عن الأسعار، أخبره أن الأسعار تختلف حسب المساحة ونوع الخشب، واطلب منه التواصل عبر واتساب للحصول على عرض سعر دقيق.
      `;

      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: userMessage,
        config: {
          systemInstruction: systemInstruction,
        }
      });

      setMessages(prev => [...prev, { role: 'bot', text: response.text || 'عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.' }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'bot', text: 'عذراً، لا يمكنني الاتصال بالخادم حالياً. يرجى التواصل معنا عبر واتساب.' }]);
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
            className="absolute bottom-16 left-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col h-[450px]"
          >
            <div className="bg-brand-blue p-4 flex justify-between items-center text-white">
              <div className="flex items-center gap-2">
                <MessageCircle size={20} />
                <span className="font-bold">مساعد الأمين الذكي</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:text-brand-orange transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 flex flex-col">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' 
                      ? 'bg-brand-orange text-white rounded-tl-none' 
                      : 'bg-white text-gray-800 border border-gray-100 shadow-sm rounded-tr-none'
                  }`}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-white border border-gray-100 shadow-sm p-3 rounded-2xl rounded-tr-none flex gap-1">
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-brand-blue text-white p-2 rounded-xl hover:bg-brand-orange transition-colors disabled:opacity-50"
              >
                <Send size={20} className="transform rotate-180" />
              </button>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                placeholder="اسألني أي شيء..."
                className="flex-1 bg-gray-100 rounded-xl px-4 py-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
                dir="rtl"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`bg-brand-blue text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform flex items-center justify-center ${isOpen ? 'rotate-90' : ''}`}
      >
        {isOpen ? <X size={32} /> : <MessageCircle size={32} />}
      </button>
    </div>
  );
};

const AdminPanel = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('برجولات حدائق');
  const [image, setImage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1048576) {
        alert('حجم الصورة كبير جداً. أقصى حجم هو 1 ميجابايت.');
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setImage(dataUrl);
        };
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !category || !image) return;
    setIsUploading(true);
    try {
      await addDoc(collection(db, 'gallery'), {
        title,
        category,
        image,
        createdAt: Timestamp.now()
      });
      setTitle('');
      setImage('');
      setIsOpen(false);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="fixed bottom-28 right-8 z-40">
        <button onClick={handleLogin} className="bg-gray-800 text-white p-3 rounded-full shadow-lg hover:bg-gray-700 transition-colors" title="تسجيل دخول الإدارة">
          <LogIn size={20} />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-28 right-8 z-40 flex flex-col items-end gap-4">
      <div className="flex gap-2">
        <button onClick={() => setIsOpen(!isOpen)} className="bg-brand-blue text-white px-4 py-2 rounded-full shadow-lg hover:bg-brand-orange transition-colors flex items-center gap-2">
          <ImagePlus size={20} /> إضافة صورة
        </button>
        <button onClick={handleLogout} className="bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors" title="تسجيل خروج">
          <LogOut size={20} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="bg-white p-6 rounded-2xl shadow-2xl w-80 border border-gray-100"
          >
            <h3 className="text-xl font-bold text-brand-blue mb-4 text-right">إضافة عمل جديد</h3>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">اسم العمل</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">القسم</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-right" dir="rtl">
                  <option value="برجولات حدائق">برجولات حدائق</option>
                  <option value="برجولات روف">برجولات روف</option>
                  <option value="أسقف ديكورية">أسقف ديكورية</option>
                  <option value="أعمال خشبية">أعمال خشبية</option>
                  <option value="ديكورات خشبية">ديكورات خشبية</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 text-right">الصورة</label>
                <input type="file" accept="image/*" onChange={handleImageChange} required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-light file:text-brand-blue hover:file:bg-brand-orange hover:file:text-white text-right" />
              </div>
              {image && (
                <div className="mt-2 rounded-lg overflow-hidden h-32">
                  <img src={image} alt="Preview" className="w-full h-full object-cover" />
                </div>
              )}
              <button type="submit" disabled={isUploading} className="w-full bg-brand-orange text-white py-2 rounded-lg font-bold hover:bg-brand-blue transition-colors disabled:opacity-50 flex justify-center items-center gap-2">
                {isUploading ? 'جاري الرفع...' : <><Upload size={18} /> رفع الصورة</>}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
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
      <AdminPanel />
    </div>
  );
}
