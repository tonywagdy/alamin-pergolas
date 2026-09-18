import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { BEFORE_AFTER_ITEMS } from '../data';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export const BeforeAfter: React.FC = () => {
  const [sliderPosition, setSliderPosition] = useState<number>(50);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Dynamic Before & After item with local storage caching for immediate 0ms render
  const [currentItem, setCurrentItem] = useState(() => {
    try {
      const cached = localStorage.getItem('alamin_before_after');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.beforeImage && parsed.afterImage) {
          return {
            ...BEFORE_AFTER_ITEMS[0],
            ...parsed
          };
        }
      }
    } catch (e) {
      // ignore
    }
    return BEFORE_AFTER_ITEMS[0];
  });

  // Listen to live updates from Firestore
  useEffect(() => {
    try {
      const unsub = onSnapshot(doc(db, 'before_after', 'main'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data && data.beforeImage && data.afterImage) {
            const updated = {
              id: 1,
              title: data.title || BEFORE_AFTER_ITEMS[0].title,
              description: data.description || BEFORE_AFTER_ITEMS[0].description,
              beforeImage: data.beforeImage,
              afterImage: data.afterImage,
              location: data.location || BEFORE_AFTER_ITEMS[0].location
            };
            setCurrentItem(updated);
            try {
              localStorage.setItem('alamin_before_after', JSON.stringify(updated));
            } catch (err) {}
          }
        }
      }, (error) => {
        console.warn("Before-after live sync notice:", error);
      });

      return () => unsub();
    } catch (error) {
      console.warn("Before-after listener notice:", error);
    }
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    updatePosition(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Pointer capture may have already been released
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      setSliderPosition((prev) => Math.max(0, prev - 5));
    }
  };

  return (
    <section id="before-after" className="py-24 bg-white overflow-hidden border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-14">
          <span className="inline-block text-xs sm:text-sm font-bold text-[#f39c12] uppercase tracking-widest mb-3 bg-amber-50 px-4 py-1.5 rounded-full">
            شاهد التحول بنفسك
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#143d6a]">
            قبل وبعد التركيب (تحول حقيقي 180 درجة)
          </h2>
          <div className="h-1 bg-[#f39c12] w-24 mx-auto mt-5 rounded-full" />
          <p className="mt-4 text-gray-600 max-w-2xl mx-auto text-base sm:text-lg leading-relaxed">
            اسحب المقبض في المنتصف يميناً ويساراً لمقارنة المكان قبل العمل وبعد اكتمال التركيب والتشطيب النهائي.
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Interactive Comparison Box */}
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onKeyDown={handleKeyDown}
            tabIndex={0}
            role="slider"
            aria-valuenow={Math.round(sliderPosition)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="سلايدر مقارنة الصور قبل وبعد"
            className="relative aspect-[16/10] sm:aspect-[16/9] w-full rounded-3xl overflow-hidden shadow-2xl select-none border-4 border-slate-100 bg-slate-900 cursor-ew-resize touch-none focus:outline-none focus:ring-4 focus:ring-[#f39c12]/30"
          >
            {/* 1. Permanent Badges (Always Visible on both sides) */}
            {/* Left side: AFTER (Orange Brand Color) */}
            <div className="absolute top-4 left-4 z-20 bg-[#f39c12] text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg border border-white/20 flex items-center gap-1.5 pointer-events-none">
              <Sparkles size={15} />
              <span>بعد التركيب</span>
            </div>

            {/* Right side: BEFORE (Dark Color) */}
            <div className="absolute top-4 right-4 z-20 bg-gray-900/90 backdrop-blur-xs text-white font-extrabold px-4 py-2 rounded-xl text-xs sm:text-sm shadow-lg border border-white/15 pointer-events-none">
              <span>قبل العمل</span>
            </div>

            {/* 2. "After" Image (Underneath base layer, 100% visible) */}
            <img
              src={currentItem.afterImage}
              alt={`${currentItem.title} - بعد التركيب`}
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
            />

            {/* 3. "Before" Image (Clipped to the right side of the slider) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `inset(0 0 0 ${sliderPosition}%)` }}
            >
              <img
                src={currentItem.beforeImage}
                alt={`${currentItem.title} - قبل التركيب`}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
              />
            </div>

            {/* 4. Vertical Dividing Line with Distinct Handle */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(0,0,0,0.6)] z-30 pointer-events-none -translate-x-1/2"
              style={{ left: `${sliderPosition}%` }}
            >
              {/* Circular Handle with Opposing Arrows ⇔ */}
              <div 
                className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#f39c12] text-white flex flex-col items-center justify-center shadow-2xl border-3 border-white ring-4 ring-black/20 transition-transform ${
                  isDragging ? 'scale-110' : 'hover:scale-105'
                }`}
              >
                <ArrowLeftRight size={22} className="drop-shadow-sm animate-pulse" />
                <span className="text-[9px] font-black leading-none mt-0.5 tracking-tighter">اسحب</span>
              </div>
            </div>
          </div>

          {/* User instruction notice */}
          <div className="mt-4 text-center text-xs text-gray-500 font-medium">
            💡 اسحب المقبض بإصبعك أو الماوس لمشاهدة الفرق بدقة
          </div>
        </div>
      </div>
    </section>
  );
};
