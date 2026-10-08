import React, { useState, useRef, useEffect } from 'react';
import { Phone, MessageCircle, MapPin, CheckCircle, Send, ShieldCheck } from 'lucide-react';
import { PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

import { LEAD_SERVICES, validateLead, awaitLeadConfirmation, LeadForm } from '../utils/leads';

export const Contact: React.FC<{ initialService?: string }> = ({ initialService = LEAD_SERVICES[0] }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: initialService,
    city: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  const [error, setError] = useState('');
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (isSuccess) successRef.current?.focus(); }, [isSuccess]);
  const [website, setWebsite] = useState('');
  const pending = useRef<{ key: string; id: string; write: Promise<void>; data: LeadForm } | null>(null);
  const requestLock = useRef(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (requestLock.current || website) return;
    const checked = validateLead(formData);
    if (!checked.data || !privacyAccepted) {
      setError(checked.error || 'يرجى الموافقة على استخدام بياناتك للتواصل بخصوص طلبك.');
      return;
    }
    requestLock.current = true;
    setIsSubmitting(true);
    setError('');
    const data = checked.data;
    const text = `طلب عرض سعر من موقع الأمين للبرجولات:
الاسم: ${data.name}
الهاتف: ${data.phone}
الخدمة: ${data.service}
منطقة التنفيذ: ${data.city}
التفاصيل: ${data.message || 'بدون ملاحظات'}`;
    setWhatsappUrl(`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent(text)}`);
    const key = JSON.stringify(data);
    try {
      if (!pending.current || pending.current.key !== key) {
        const [{ db }, { collection, doc, setDoc, serverTimestamp }] = await Promise.all([import('../firebase'), import('firebase/firestore')]);
        const ref = doc(collection(db, 'leads'));
        pending.current = { key, id: ref.id, data, write: setDoc(ref, {
          ...data, createdAt: serverTimestamp(), status: 'new', privacyConsent: true,
          landingPage: window.location.pathname === '/roof-pergolas' ? 'roof' : window.location.pathname === '/garden-pergolas' ? 'garden' : 'home'
        }) };
        // Preserve timeouts for retry, but clear a definitively rejected write.
        const request = pending.current;
        request.write.catch(() => { if (pending.current === request) pending.current = null; });
      }
      const request = pending.current;
      await awaitLeadConfirmation(request.write);
      trackGAEvent('generate_lead', { service: data.service, lead_id: request.id,
        landing_page: window.location.pathname });
      pending.current = null;
      setAwaitingConfirmation(false);
      setIsSuccess(true);
      setFormData({ name: '', phone: '', city: '', service: initialService, message: '' });
    } catch (err) {
      const uncertain = err instanceof Error && err.message === 'confirmation-timeout';
      setAwaitingConfirmation(uncertain);
      setError(uncertain
        ? 'لم يصل تأكيد الحفظ بعد. اضغط «التحقق من الطلب» أو تواصل عبر واتساب. لا نؤكد استلام الطلب قبل الحفظ.'
        : 'تعذر إرسال الطلب. بياناتك ما زالت في النموذج؛ حاول مرة أخرى أو أرسلها عبر واتساب.');
    } finally {
      requestLock.current = false;
      setIsSubmitting(false);
    }
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
                href={`tel:+${PHONE_NUMBER_INTL}`}
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
                  <p className="text-lg font-bold">القاهرة والجيزة والتجمع والشيخ زايد والسواحل</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div
            className="bg-white rounded-3xl p-5 sm:p-10 text-[#143d6a] shadow-2xl text-right"
          >
            <h3 className="text-2xl font-black mb-2">طلب معاينة مجانية</h3>
            <p className="text-gray-500 text-sm mb-6">اكتب بيانات مشروعك وسنتواصل معك لتحديد المعاينة وعرض السعر خلال ساعات العمل.</p>

            {isSuccess ? (
              <div ref={successRef} role="status" aria-live="polite" tabIndex={-1} className="bg-emerald-50 border border-emerald-200 p-6 sm:p-8 rounded-2xl text-center space-y-4">
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
                    onClick={() => trackGAEvent('whatsapp_click', { source: 'lead_success' })}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3.5 px-4 rounded-xl font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all"
                  >
                    <MessageCircle size={18} />
                    <span>متابعة الطلب عبر الواتساب مباشرة</span>
                  </a>
                )}
                <div>
                  <button
                    onClick={() => { setIsSuccess(false); setError(''); setWhatsappUrl(''); }}
                    className="mt-2 text-gray-500 hover:text-[#143d6a] text-xs font-bold underline transition-colors cursor-pointer"
                  >
                    إرسال طلب استفسار آخر
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4" aria-busy={isSubmitting}>
                <div className="sr-only" aria-hidden="true">
                  <label htmlFor="company-website">الموقع الإلكتروني</label>
                  <input id="company-website" name="website" tabIndex={-1} autoComplete="off" value={website} onChange={e => setWebsite(e.target.value)} />
                </div>
                <fieldset disabled={isSubmitting || awaitingConfirmation} className="space-y-4">
                <div>
                  <label htmlFor="customer-name" className="block text-xs font-bold text-gray-700 mb-1.5">الاسم بالكامل *</label>
                  <input
                    id="customer-name" name="name" autoComplete="name" minLength={2} maxLength={80}
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium"
                    placeholder="اكتب اسمك الكريم"
                  />
                </div>

                <div>
                  <label htmlFor="customer-phone" className="block text-xs font-bold text-gray-700 mb-1.5">رقم الهاتف أو الواتساب *</label>
                  <input
                    id="customer-phone" name="phone" autoComplete="tel" inputMode="tel" maxLength={20}
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
                  <label htmlFor="service-type" className="block text-xs font-bold text-gray-700 mb-1.5">نوع الخدمة المطلوبة</label>
                  <select
                    id="service-type"
                    name="service"
                    aria-label="نوع الخدمة المطلوبة"
                    value={formData.service}
                    onChange={(e) => setFormData({ ...formData, service: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium"
                  >
                    {LEAD_SERVICES.map(service => <option key={service} value={service}>{service}</option>)}
                  </select>
                </div>

                <div>
                  <label htmlFor="customer-city" className="block text-xs font-bold text-gray-700 mb-1.5">منطقة التنفيذ أو المحافظة *</label>
                  <input id="customer-city" name="city" required minLength={2} maxLength={80} autoComplete="address-level2" value={formData.city}
                    onChange={e => setFormData({ ...formData, city: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 text-sm" placeholder="مثال: التجمع الخامس، القاهرة" />
                </div>
                <div>
                  <label htmlFor="customer-message" className="block text-xs font-bold text-gray-700 mb-1.5">تفاصيل أو مقاسات تقريبية (اختياري)</label>
                  <textarea
                    id="customer-message" name="message" maxLength={1500}
                    rows={3}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3.5 focus:border-[#f39c12] focus:ring-1 focus:ring-[#f39c12] outline-none text-sm font-medium"
                    placeholder="المساحة التقريبية، مكان التنفيذ، أو أي مواصفات ترغب بها..."
                  ></textarea>
                </div>

                <label className="flex gap-2 items-start text-sm text-gray-600">
                  <input type="checkbox" required checked={privacyAccepted} onChange={e => setPrivacyAccepted(e.target.checked)} className="mt-1" />
                  <span>أوافق على استخدام بياناتي للتواصل بشأن طلبي وفق <a href="/privacy.html" target="_blank" rel="noopener noreferrer" className="underline text-[#143d6a]">سياسة الخصوصية</a>.</span>
                </label>
                </fieldset>
                {error && <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-800">
                  <p>{error}</p>
                  {whatsappUrl && <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" onClick={() => trackGAEvent('whatsapp_click', { source: 'lead_fallback' })} className="block underline font-bold mt-2">إرسال الطلب عبر واتساب</a>}
                </div>}
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
                      <span>{awaitingConfirmation ? 'التحقق من الطلب' : 'إرسال طلب عرض سعر ومعاينة'}</span>
                    </>
                  )}
                </button>

                <p className="text-xs text-gray-400 text-center flex items-center justify-center gap-1 mt-2">
                  <ShieldCheck size={14} className="text-emerald-500" />
                  <span>نستخدم بياناتك للتواصل بشأن مشروعك. إرسال رسالة واتساب يتم باختيارك.</span>
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
