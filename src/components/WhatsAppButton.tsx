import React from 'react';
import { MessageCircle } from 'lucide-react';
import { PHONE_NUMBER_INTL, trackGAEvent } from '../data';

export const WhatsAppButton: React.FC = () => {
  const handleClick = () => {
    trackGAEvent('whatsapp_click', { source: 'floating_button' });
  };

  return (
    <a 
      href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين للبرجولات، أود الاستفسار عن تفاصيل وطلب معاينة مجانية.')}`}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      aria-label="تواصل مع شركة الأمين للبرجولات عبر واتساب"
      className="fixed bottom-6 right-6 z-40 bg-green-500 text-white p-4 rounded-full shadow-2xl hover:bg-green-600 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
    >
      <MessageCircle size={30} className="group-hover:rotate-12 transition-transform" />
      <span className="sr-only">تواصل عبر الواتساب</span>
    </a>
  );
};
