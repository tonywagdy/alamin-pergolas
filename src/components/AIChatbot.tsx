import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, MessageCircle } from 'lucide-react';
import { PHONE_NUMBER_INTL, PHONE_NUMBER_LOCAL, trackGAEvent } from '../data';

interface ChatMessage {
  role: 'user' | 'bot';
  text: string;
}

export const AIChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'bot', 
      text: 'أهلاً بك في شركة الأمين للبرجولات! أنا المساعد الذكي، كيف أستطيع مساعدتك اليوم بخصوص الأسعار، أنواع الأخشاب، أو حجز معاينة؟' 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    const newMessages: ChatMessage[] = [...messages, { role: 'user', text: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    trackGAEvent('chatbot_message_sent', { length: userMessage.length });

    try {
      // Call secure backend proxy (/api/chat)
      // The API key is securely stored on the server/Cloud Function and NEVER exposed to frontend
      const chatApiUrl = (import.meta as any).env?.VITE_CHAT_API_URL || '/api/chat';
      
      const response = await fetch(chatApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: newMessages.slice(-8) // Send recent history for conversational continuity
        })
      });

      if (!response.ok) {
        throw new Error(`Chat API error with status: ${response.status}`);
      }

      const data = await response.json();
      const botResponse = data.reply || data.text || "أهلاً بك! يمكنك أيضاً التواصل مباشرة مع فريق شركة الأمين هاتفياً أو عبر الواتساب على 01017919385.";
      
      setMessages(prev => [...prev, { role: 'bot', text: botResponse }]);
    } catch (error) {
      console.warn("Chatbot request fallback:", error);
      setMessages(prev => [
        ...prev, 
        { 
          role: 'bot', 
          text: `يسعدنا خدمتك دائماً! يمكنك التحدث مباشرة مع فريق شركة الأمين عبر الواتساب على الرقم ${PHONE_NUMBER_LOCAL} وسنرد على كل تفاصيل طلبك فوراً.` 
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-40">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="bg-white rounded-3xl shadow-2xl w-[90vw] sm:w-96 overflow-hidden border border-gray-100 mb-4 flex flex-col h-[480px] max-h-[80vh]"
          >
            {/* Header */}
            <div className="bg-[#143d6a] p-4 text-white flex justify-between items-center text-right">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#f39c12] flex items-center justify-center text-white shadow-xs">
                  <Bot size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">مساعد الأمين الذكي</h3>
                  <span className="text-[11px] text-amber-200 block">متاح دائماً لمساعدتك</span>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
                aria-label="إغلاق نافذة المساعد الذكي"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 text-right">
              {messages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}
                >
                  <div 
                    className={`max-w-[85%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-[#f39c12] text-white rounded-tr-none shadow-xs' 
                        : 'bg-white text-[#143d6a] border border-gray-200/70 rounded-tl-none shadow-xs'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-end">
                  <div className="bg-white p-3 rounded-2xl border border-gray-200/70 rounded-tl-none shadow-xs">
                    <div className="flex gap-1.5 items-center">
                      <span className="w-2 h-2 bg-[#143d6a]/40 rounded-full animate-bounce"></span>
                      <span className="w-2 h-2 bg-[#143d6a]/40 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 bg-[#143d6a]/40 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Direct WhatsApp Quick Link */}
            <div className="bg-amber-50/70 px-4 py-2 border-t border-amber-100/80 flex justify-between items-center text-xs">
              <span className="text-gray-600 font-medium">تحتاج رداً بشرياً فورياً؟</span>
              <a
                href={`https://wa.me/${PHONE_NUMBER_INTL}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => trackGAEvent('whatsapp_click', { source: 'chatbot_inner_link' })}
                className="text-[#143d6a] hover:text-[#f39c12] font-bold flex items-center gap-1"
              >
                <MessageCircle size={14} className="text-green-600" />
                <span>واتساب شركة الأمين</span>
              </a>
            </div>

            {/* Input Footer */}
            <div className="p-3 bg-white border-t border-gray-100 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="اسألني عن الخشب، الأسعار، أو المعاينة..."
                className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs sm:text-sm outline-none focus:border-[#f39c12] text-right font-medium"
                aria-label="رسالة للمساعد الذكي"
              />
              <button 
                onClick={handleSend}
                disabled={isLoading || !input.trim()}
                className="bg-[#143d6a] hover:bg-[#f39c12] text-white p-2.5 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
                aria-label="إرسال الرسالة"
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) trackGAEvent('chatbot_opened');
        }}
        aria-label={isOpen ? "إغلاق المساعد الذكي" : "فتح المساعد الذكي لشركة الأمين"}
        className="bg-[#143d6a] text-white p-4 rounded-full shadow-2xl hover:bg-[#f39c12] hover:scale-110 active:scale-95 transition-all duration-300 flex items-center justify-center group"
      >
        {isOpen ? <X size={28} /> : <Bot size={28} className="group-hover:rotate-6 transition-transform" />}
      </button>
    </div>
  );
};
