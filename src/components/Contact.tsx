import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Phone, MessageCircle, MapPin, CheckCircle, Send, Clock, ShieldCheck } from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

export const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: 'برجولة حديقة وفلل',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.trim();
    const cleanMessage = formData.message.trim();
    const cleanService = formData.service;

    if (!cleanName || !cleanPhone) return;

    setIsSubmitting(true);

    const leadPayload = {
      name: cleanName,
      phone: cleanPhone,
      service: cleanService,
      message: cleanMessage,
      createdAt: serverTimestamp(),
      status: 'new'
    };

    // 1. Save to localStorage backup so no customer inquiry is ever lost
    try {
      const stored = localStorage.getItem('alamin_local_leads');
      const leadsList = stored ? JSON.parse(stored) : [];
      leadsList.unshift({
        id: 'local_' + Date.now(),
        name: cleanName,
        phone: cleanPhone,
        service: cleanService,
        message: cleanMessage,
        createdAt: new Date().toISOString(),
        status: 'new'
      });
      localStorage.setItem('alamin_local_leads', JSON.stringify(leadsList.slice(0, 50)));
    } catch (err) {
      console.warn("LocalStorage lead save notice:", err);
    }

    // 2. Save lead to Firestore collection 'leads'
    try {
      await addDoc(collection(db, 'leads'), leadPayload);
    } catch (error) {
      console.warn("Notice: Firestore save will sync or fallback locally:", error);
    }

    // 3. Track event in Google Analytics
    try {
      trackGAEvent('lead_form_submit', {
        service: cleanService
      });
    } catch (err) {
      // ignore
    }

    // 4. Formulate WhatsApp Direct Message
    const text = `طلب جديد من الموقع الرسمي لشركة الأمين:
- الاسم: ${cleanName}
- رقم الهاتف: ${cleanPhone}
- نوع الخدمة: ${cleanService}
- التفاصيل أو المقاسات: ${cleanMessage || 'بدون ملاحظات إضافية'}`;

    const waLink = `https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(text)}`;
    setWhatsappUrl(waLink);

    // Show success view
    setIsSuccess(true);
    setIsSubmitting(false);

    // Try opening WhatsApp in a safe manner
    try {
      window.open(waLink, '_blank');
    } catch (err) {
      console.warn("Window open notice:", err);
    }

    // Reset fields
    setFormData({
      name: '',
      phone: '',
      service: 'برجولة حديقة وفلل',
      message: ''
    });
  };

  return (
    <section id="contact" className="py-24 bg-[#143d6a] text-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Contact Details & Info */}
          <div className="text-right">
            <span className="inline-block text-xs sm:text-sm font-bold text-amber-300 uppercase tracking-widest mb-3 bg-white/10 px-4 py-1.5 rounded-full">
              تواصل معنا فوراً
            </span>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-6 leading-tight">
              جاهزون لخدمتك وتنفيذ مشروعك بأعلى دقة
            </h2>
            <p className="text-base sm:text-lg text-gray-200 mb-10 leading-relaxed font-light">
              سواء كنت ترغب في معرفة الأسعار، أو حجز موعد للمعاينة المجانية، أو استشارة بخصوص نوع الخشب الأنسب لمكانك؛ نحن هنا لخدمتك دائماً.
            </p>

            <div className="space-y-6">
              {/* Phone Card */}
              <a 
                href={`tel:${PHONE_NUMBER_INTL}`} 
                onClick={() => trackGAEvent('phone_call_click', { source: 'contact_section' })}
                className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer"
              >
                <div className="bg-[#f39c12] text-white p-3.5 rounded-xl shadow-md group-hover:scale-105 transition-transform">
                  <Phone size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-300 font-bold mb-0.5">اتصال هاتفي مباشر</p>
                  <p className="text-xl font-bold tracking-wide">{PHONE_NUMBER_LOCAL}</p>
                </div>
              </a>

              {/* WhatsApp Card */}
              <a 
                href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين للبرجولات، أود الاستفسار عن تفاصيل وطلب معاينة مجانية.')}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackGAEvent('whatsapp_click', { source: 'contact_section' })}
                className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors group cursor-pointer"
              >
                <div className="bg-green-500 text-white p-3.5 rounded-xl shadow-md group-hover:scale-105 transition-transform">
                  <MessageCircle size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-300 font-bold mb-0.5">محادثة واتساب سريعة</p>
                  <p className="text-xl font-bold tracking-wide">{PHONE_NUMBER_LOCAL}</p>
                </div>
              </a>

              {/* Location Card */}
              <div className="flex items-center gap-5 p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="bg-amber-400 text-[#143d6a] p-3.5 rounded-xl shadow-md">
                  <MapPin size={22} />
                </div>
                <div>
                  <p className="text-xs text-gray-300 font-bold mb-0.5">تغطية العمل والمواقع</p>
                  <p className="text-lg font-bold">القاهرة الكبرى ومتاحون في جميع محافظات مصر</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white rounded-3xl p-8 sm:p-10 text-[#143d6a] shadow-2xl text-right"
          >
            <h3 className="text-2xl font-black mb-2">طلب معاينة مجانية</h3>
            <p className="text-gray-500 text-sm mb-6">املأ البيانات وسيقوم فريق شركة الأمين بالرد والتواصل معك خلال ساعة واحدة.</p>

            {isSuccess ? (
              <div className="bg-emerald-50 border border-emerald-200 p-6 sm:p-8 rounded-2xl text-center space-y-4">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle size={34} />
                </div>
                <h4 className="text-xl sm:text-2xl font-black text-emerald-800">تم استلام طلبك بنجاح!</h4>
                <p className="text-sm text-emerald-700 leading-relaxed max-w-md mx-auto">
                  شكراً لتواصلك مع شركة الأمين للبرجولات. تم تسجيل بيانات طلبك وسيقوم المهندس المسؤول بالتواصل معك هاتفياً أو عبر الواتساب في أقرب وقت لتحديد موعد المعاينة.
                </p>
                {whatsappUrl && (
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>متابعة الطلب عبر الواتساب مباشرة</span>
                  </a>
                )}
                <div>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="mt-2 text-gray-500 hover:text-[#143d6a] text-xs font-bold underline transition-colors cursor-pointer"
                  >
                    إرسال طلب استفسار آخر
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">الاسم بالكامل *</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium" 
                    placeholder="اكتب اسمك الكريم" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف أو الواتساب *</label>
                  <input 
                    type="tel" 
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium" 
                    placeholder="01012345678" 
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">نوع الخدمة المطلوبة</label>
                  <select 
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium"
                  >
                    <option value="برجولة حديقة وفلل">برجولة حديقة وفلل</option>
                    <option value="برجولة روف وأسطح">برجولة روف وأسطح</option>
                    <option value="سقف ديكوري وتجاليد حوائط">سقف ديكوري وتجاليد حوائط</option>
                    <option value="أعمال خشبية وبوابات مخصصة">أعمال خشبية وبوابات مخصصة</option>
                    <option value="صيانة وتجديد برجولة قديمة">صيانة وتجديد برجولة قديمة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">تفاصيل أو مقاسات تقريبية (اختياري)</label>
                  <textarea 
                    rows={3} 
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium" 
                    placeholder="المساحة التقريبية، مكان التنفيذ، أو أي مواصفات ترغب بها..."
                  ></textarea>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-[#f39c12] text-white py-4 rounded-xl font-bold text-base hover:bg-amber-600 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isSubmitting ? (
                    <span>جاري إرسال طلبك...</span>
                  ) : (
                    <>
                      <Send size={18} />
                      <span>إرسال الطلب وحجز المعاينة المجانية</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 mt-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>بياناتك في أمان تام ولا يتم مشاركتها إطلاقاً.</span>
                </p>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};
