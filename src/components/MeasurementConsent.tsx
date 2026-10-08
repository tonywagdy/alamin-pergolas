import React, { useEffect, useState } from 'react';
import { getConsent, isMeasurementConfigured, setConsent } from '../utils/analytics';

export function MeasurementConsent() {
  const [visible, setVisible] = useState(isMeasurementConfigured && !getConsent());
  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener('alamin-open-consent', open);
    return () => window.removeEventListener('alamin-open-consent', open);
  }, []);
  if (!visible) return null;
  const choose = (value: 'granted' | 'denied') => { setConsent(value); setVisible(false); };
  return <aside aria-label="اختيارات ملفات القياس" className="fixed bottom-0 inset-x-0 z-[60] bg-white border-t border-slate-200 shadow-xl p-4 text-[#143d6a]" dir="rtl">
    <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4 items-center">
      <p className="text-sm flex-1">بموافقتك نستخدم ملفات قياس لمعرفة أداء الموقع والإعلانات. يمكنك الرفض والاستمرار في استخدام الموقع وطلب عرض سعر. <a className="underline" href="/privacy.html">سياسة الخصوصية</a></p>
      <div className="flex gap-3 shrink-0">
        <button type="button" onClick={() => choose('denied')} className="rounded-lg border border-[#143d6a] px-5 py-3 font-bold">رفض القياس</button>
        <button type="button" onClick={() => choose('granted')} className="rounded-lg bg-[#143d6a] text-white px-5 py-3 font-bold">السماح بالقياس</button>
      </div>
    </div>
  </aside>;
}
