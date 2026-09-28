import React, { ReactNode } from 'react';
import { MessageCircle, RotateCcw } from 'lucide-react';
import { PHONE_NUMBER_INTL } from '../data';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public props: Props;
  public state: State;

  constructor(props: Props) {
    super(props);
    this.props = props;
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[ErrorBoundary] Caught runtime exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6 text-center bg-slate-50" dir="rtl">
          <div className="max-w-md w-full p-8 rounded-3xl bg-white shadow-xl border border-gray-100 text-right">
            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-[#f39c12] mb-4">
              <RotateCcw size={24} />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-[#143d6a] mb-2">
              {this.props.fallbackTitle || "عذراً، حدث خطأ غير متوقع"}
            </h2>
            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              يمكنك تحديث الصفحة للمحاولة مجدداً، أو التواصل المباشر مع فريق عمل شركة الأمين عبر الهاتف أو الواتساب.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 bg-[#143d6a] hover:bg-[#1a4a7f] text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw size={16} />
                <span>إعادة المحاولة</span>
              </button>
              
              <a
                href={`https://wa.me/${PHONE_NUMBER_INTL}?text=${encodeURIComponent('مرحباً شركة الأمين للبرجولات، أود الاستفسار.')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 px-4 rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                <MessageCircle size={16} />
                <span>واتساب</span>
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
