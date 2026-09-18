import React from 'react';
import { MessageCircle, Facebook, Instagram, Phone, MapPin } from 'lucide-react';
import { LOGO_URL, PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#0e2c4d] text-white py-14 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 text-right pb-10 border-b border-white/10">
          {/* Col 1: Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="bg-white p-2 rounded-xl shadow-xs">
                <img 
                  src={LOGO_URL} 
                  alt="الأمين للبرجولات" 
                  className="h-12 w-auto" 
                  referrerPolicy="no-referrer" 
                />
              </div>
              <div>
                <span className="text-xl font-black block">الأمين للبرجولات</span>
                <span className="text-xs text-gray-300">تصميم وتنفيذ البرجولات والأعمال الخشبية</span>
              </div>
            </div>

            <p className="text-sm text-gray-300 max-w-md leading-relaxed">
              شركة رائدة في تصنيع وتركيب البرجولات الخشبية للحدائق والروف في مصر. نعتمد على أجود الأخشاب الطبيعية المعالجة مع دهانات عازلة وضمان حقيقي على الجودة.
            </p>

            <div className="flex gap-3 pt-2">
              <a 
                href={`https://wa.me/${PHONE_NUMBER_INTL}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                onClick={() => trackGAEvent('whatsapp_click', { source: 'footer' })}
                className="bg-white/10 p-3 rounded-full hover:bg-[#f39c12] transition-colors"
                aria-label="تواصل مع شركة الأمين عبر الواتساب"
              >
                <MessageCircle size={18} />
              </a>
              <a 
                href="https://www.facebook.com/Aminforpergola/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white/10 p-3 rounded-full hover:bg-[#f39c12] transition-colors"
                aria-label="صفحة فيسبوك لشركة الأمين"
              >
                <Facebook size={18} />
              </a>
              <a 
                href="https://www.instagram.com/elamincompany" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="bg-white/10 p-3 rounded-full hover:bg-[#f39c12] transition-colors"
                aria-label="صفحة إنستغرام لشركة الأمين"
              >
                <Instagram size={18} />
              </a>
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="font-bold text-base mb-4 text-[#f39c12]">روابط سريعة</h4>
            <ul className="space-y-2.5 text-sm text-gray-300 font-medium">
              <li><a href="#home" className="hover:text-amber-300 transition-colors">الرئيسية</a></li>
              <li><a href="#services" className="hover:text-amber-300 transition-colors">خدماتنا</a></li>
              <li><a href="#gallery" className="hover:text-amber-300 transition-colors">معرض الأعمال</a></li>
              <li><a href="#steps" className="hover:text-amber-300 transition-colors">خطوات الشغل</a></li>
              <li><a href="#before-after" className="hover:text-amber-300 transition-colors">قبل وبعد</a></li>
              <li><a href="#about" className="hover:text-amber-300 transition-colors">من نحن</a></li>
              <li><a href="#faq" className="hover:text-amber-300 transition-colors">الأسئلة الشائعة</a></li>
            </ul>
          </div>

          {/* Col 3: Direct Contacts */}
          <div>
            <h4 className="font-bold text-base mb-4 text-[#f39c12]">تواصل مباشر</h4>
            <ul className="space-y-3 text-sm text-gray-300">
              <li className="flex items-center gap-2.5">
                <Phone size={16} className="text-[#f39c12] flex-shrink-0" />
                <a 
                  href={`tel:${PHONE_NUMBER_INTL}`} 
                  onClick={() => trackGAEvent('phone_call_click', { source: 'footer' })}
                  className="hover:text-amber-300 font-bold"
                >
                  {PHONE_NUMBER_LOCAL}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle size={16} className="text-green-400 flex-shrink-0" />
                <a 
                  href={`https://wa.me/${PHONE_NUMBER_INTL}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:text-amber-300 font-bold"
                >
                  واتساب: {PHONE_NUMBER_LOCAL}
                </a>
              </li>
              <li className="flex items-start gap-2.5">
                <MapPin size={16} className="text-[#f39c12] flex-shrink-0 mt-1" />
                <span>القاهرة الكبرى، الشيخ زايد، التجمع، وكافة محافظات مصر</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 flex flex-col sm:flex-row justify-between items-center text-xs text-gray-400 gap-4">
          <p>© {new Date().getFullYear()} شركة الأمين للبرجولات. جميع الحقوق محفوظة.</p>
          <p>تصميم وتطوير احترافي فائق الأمان والسرعة.</p>
        </div>
      </div>
    </footer>
  );
};
