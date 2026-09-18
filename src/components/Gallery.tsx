import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Layers, Maximize2, Trash2, ArrowLeft, MessageCircle, X, ChevronRight, ChevronLeft } from 'lucide-react';
import { db, auth } from '../firebase';
import { collection, onSnapshot, query, orderBy, deleteDoc, doc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { PROJECTS, PHONE_NUMBER_INTL, trackGAEvent } from '../data';
import { Project } from '../types';

const CATEGORIES = [
  "الكل",
  "برجولات حدائق",
  "برجولات روف",
  "أسقف ديكورية",
  "أعمال خشبية",
  "ديكورات خشبية"
];

export const Gallery: React.FC = () => {
  const [firestoreProjects, setFirestoreProjects] = useState<Project[]>([]);
  const [deletedStaticIds, setDeletedStaticIds] = useState<number[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("الكل");
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setIsAdmin(user?.email === 'twagdy067@gmail.com');
    });

    const q = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    const unsubscribeDb = onSnapshot(q, (snapshot) => {
      const items: Project[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any),
        isFirestore: true
      }));
      setFirestoreProjects(items);
    }, (error) => {
      console.warn("Firestore gallery snapshot notice:", error);
    });

    const qDeleted = query(collection(db, 'deleted_static_images'));
    const unsubscribeDeleted = onSnapshot(qDeleted, (snapshot) => {
      setDeletedStaticIds(snapshot.docs.map(docSnap => Number(docSnap.id)));
    }, (error) => {
      console.warn("Deleted static images snapshot notice:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeDb();
      unsubscribeDeleted();
    };
  }, []);

  const handleDelete = async (id: string | number, isFirestore?: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const confirmDelete = window.confirm("هل أنت متأكد من رغبتك في حذف هذه الصورة نهائياً؟");
    if (!confirmDelete) return;

    try {
      if (isFirestore) {
        await deleteDoc(doc(db, 'gallery', id as string));
      } else {
        await setDoc(doc(db, 'deleted_static_images', id.toString()), { 
          deleted: true,
          deletedAt: new Date()
        });
      }
    } catch (error) {
      console.error("Delete failed", error);
      alert("حدث خطأ أثناء الحذف، يرجى المحاولة مرة أخرى.");
    }
  };

  const allProjects: Project[] = [
    ...firestoreProjects,
    ...PROJECTS.filter(p => !deletedStaticIds.includes(Number(p.id))).map(p => ({ ...p, isFirestore: false }))
  ];

  const filteredProjects = selectedCategory === "الكل"
    ? allProjects
    : allProjects.filter(p => p.category === selectedCategory);

  const handlePrev = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev === null || prev === 0 ? filteredProjects.length - 1 : prev - 1));
  }, [lightboxIndex, filteredProjects.length]);

  const handleNext = useCallback((e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (lightboxIndex === null) return;
    setLightboxIndex(prev => (prev === null || prev === filteredProjects.length - 1 ? 0 : prev + 1));
  }, [lightboxIndex, filteredProjects.length]);

  // Keyboard navigation inside lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null) return;
      if (e.key === 'Escape') setLightboxIndex(null);
      if (e.key === 'ArrowRight') handlePrev();
      if (e.key === 'ArrowLeft') handleNext();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, handlePrev, handleNext]);

  const activeProject = lightboxIndex !== null ? filteredProjects[lightboxIndex] : null;

  return (
    <section id="gallery" className="py-24 bg-slate-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="text-right">
            <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
              معرض الصور الحصري
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
              من أعمالنا الحقيقية على أرض الواقع
            </h2>
          </div>
          <a 
            href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين، أريد الاستفسار عن تفاصيل وطلب تصميم مخصص.')}`}
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={() => trackGAEvent('whatsapp_click', { source: 'gallery_header' })}
            className="text-[#143d6a] font-bold border-b-2 border-[#143d6a] pb-1 hover:text-[#f39c12] hover:border-[#f39c12] transition-all flex items-center gap-1 group text-sm sm:text-base"
          >
            <span>طلب تصميم مخصص من اختيارك</span>
            <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-1" />
          </a>
        </div>

        {/* Category Filter Pills */}
        <div className="flex justify-start md:justify-center mb-12 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-none">
          <div className="flex bg-white p-1.5 rounded-2xl border border-gray-200/80 shadow-xs gap-1.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setLightboxIndex(null);
                }}
                className={`relative px-4 sm:px-5 py-2 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedCategory === cat 
                    ? "bg-[#143d6a] text-white shadow-sm" 
                    : "text-gray-600 hover:text-[#143d6a] hover:bg-slate-100"
                }`}
              >
                <span>{cat}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Projects Grid */}
        <motion.div 
          layout
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 min-h-[350px]"
        >
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <motion.div
                layout
                key={String(project.id)}
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                transition={{ duration: 0.3, delay: (index % 6) * 0.04 }}
                onClick={() => setLightboxIndex(index)}
                className="group relative overflow-hidden rounded-3xl aspect-[4/3] shadow-sm hover:shadow-xl transition-all duration-400 bg-white cursor-pointer border border-gray-100"
              >
                <img 
                  src={project.image} 
                  alt={project.title} 
                  className="w-full h-full object-cover transition-transform duration-600 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                />

                {/* Dark Gradient on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#143d6a]/90 via-[#143d6a]/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6 text-white text-right">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Layers size={12} />
                    {project.category}
                  </span>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-bold">{project.title}</h3>
                    <span className="bg-[#f39c12] text-white p-2 rounded-full shadow-md">
                      <Maximize2 size={16} />
                    </span>
                  </div>
                </div>
                
                {isAdmin && (
                  <button 
                    onClick={(e) => handleDelete(project.id, project.isFirestore, e)}
                    className="absolute top-3 left-3 bg-red-600 hover:bg-red-700 text-white p-2.5 rounded-full shadow-lg z-20 transition-all"
                    aria-label="حذف هذه الصورة من المعرض"
                    title="حذف الصورة"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {filteredProjects.length === 0 && (
            <div className="col-span-full py-16 text-center">
              <div className="max-w-md mx-auto p-8 rounded-3xl bg-white border border-gray-200">
                <p className="text-lg font-bold text-[#143d6a] mb-2">لا توجد صور حالياً في هذا القسم</p>
                <p className="text-gray-500 mb-6 text-sm">لكننا ننفذ جميع التصاميم المخصصة حسب طلبك بالمقاسات المناسبة لمكانك.</p>
                <a 
                  href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين، أود تصميم نموذج مخصص.')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#f39c12] text-white px-6 py-2.5 rounded-full font-bold text-sm inline-flex items-center gap-2 shadow-sm"
                >
                  <span>طلب تصميمك الخاص</span>
                  <MessageCircle size={16} />
                </a>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {activeProject && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#143d6a]/95 backdrop-blur-md z-50 flex flex-col justify-center items-center p-4 sm:p-6"
            onClick={() => setLightboxIndex(null)}
          >
            {/* Top Bar inside Lightbox */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-[51]">
              <div className="text-white/80 font-bold bg-white/10 px-4 py-1.5 rounded-full text-xs sm:text-sm">
                عمل {lightboxIndex! + 1} من {filteredProjects.length}
              </div>
              
              <button 
                onClick={() => setLightboxIndex(null)}
                className="bg-white/10 hover:bg-[#f39c12] text-white p-2.5 rounded-full transition-all cursor-pointer"
                aria-label="إغلاق العارض"
              >
                <X size={22} />
              </button>
            </div>

            {/* Inner frame containing image */}
            <div 
              className="relative max-w-5xl w-full h-[60vh] sm:h-[68vh] flex justify-center items-center select-none"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                onClick={handlePrev}
                className="absolute right-1 sm:-right-14 bg-white/15 hover:bg-[#f39c12] text-white p-3 rounded-full transition-all shadow-xl z-10 hidden sm:flex items-center justify-center cursor-pointer"
                aria-label="الصورة السابقة"
              >
                <ChevronRight size={26} />
              </button>

              <div className="relative rounded-2xl overflow-hidden max-h-full max-w-full shadow-2xl border border-white/20 flex items-center justify-center bg-black/30">
                <img 
                  src={activeProject.image} 
                  alt={activeProject.title} 
                  className="max-h-[55vh] sm:max-h-[65vh] w-auto h-auto object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
              </div>

              <button 
                onClick={handleNext}
                className="absolute left-1 sm:-left-14 bg-white/15 hover:bg-[#f39c12] text-white p-3 rounded-full transition-all shadow-xl z-10 hidden sm:flex items-center justify-center cursor-pointer"
                aria-label="الصورة التالية"
              >
                <ChevronLeft size={26} />
              </button>
            </div>

            {/* Slide Details Panel underneath */}
            <div 
              className="mt-4 text-center max-w-lg w-full text-white bg-white/10 backdrop-blur-md p-5 rounded-2xl border border-white/15 shadow-xl z-10"
              onClick={(e) => e.stopPropagation()}
            >
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider bg-amber-400/20 px-3 py-1 rounded-full mb-2 inline-block">
                {activeProject.category}
              </span>
              <h3 className="text-xl sm:text-2xl font-bold mb-3 text-white">{activeProject.title}</h3>
              
              <div className="flex justify-center">
                <a 
                  href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(`مرحباً شركة الأمين للبرجولات، أريد الاستفسار عن تفاصيل وأسعار تصميم مماثل لـ "${activeProject.title}" المعروض في المعرض.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => trackGAEvent('whatsapp_click', { source: 'lightbox_cta' })}
                  className="bg-[#f39c12] text-white px-7 py-2.5 rounded-full font-bold text-sm hover:bg-amber-600 transition-all flex items-center gap-2 shadow-md"
                >
                  <span>طلب تفاصيل وأسعار هذا التصميم</span>
                  <MessageCircle size={18} />
                </a>
              </div>

              {/* Mobile Arrows Touch Navigation */}
              <div className="flex justify-center gap-4 mt-3 sm:hidden">
                <button 
                  onClick={handlePrev} 
                  className="bg-white/15 text-white p-2 rounded-full active:bg-[#f39c12]"
                  aria-label="السابق"
                >
                  <ChevronRight size={20} />
                </button>
                <button 
                  onClick={handleNext} 
                  className="bg-white/15 text-white p-2 rounded-full active:bg-[#f39c12]"
                  aria-label="التالي"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
