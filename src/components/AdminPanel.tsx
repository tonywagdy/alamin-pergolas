import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  LogOut, 
  ImagePlus, 
  Upload, 
  Users, 
  Phone, 
  MessageCircle, 
  Trash2, 
  CheckCircle2, 
  Clock, 
  X,
  Layers,
  Settings,
  Loader2,
  Sparkles
} from 'lucide-react';
import { compressImage, CompressionResult } from '../utils/imageCompressor';
import { db, auth, storage } from '../firebase';
import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy, 
  updateDoc, 
  deleteDoc, 
  doc 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { Lead } from '../types';

export const AdminPanel: React.FC = () => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'gallery' | 'leads'>('gallery');
  const [showLoginTrigger, setShowLoginTrigger] = useState(false);

  // Gallery Upload form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('برجولات حدائق');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  const [isCompressing, setIsCompressing] = useState(false);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [compressionInfo, setCompressionInfo] = useState<{
    originalSizeKb: number;
    compressedSizeKb: number;
    savingsPercent: number;
  } | null>(null);

  // Leads list states
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const checkHash = () => setShowLoginTrigger(window.location.hash === '#admin');
    checkHash();
    window.addEventListener('hashchange', checkHash);

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        if (currentUser.email === 'twagdy067@gmail.com') {
          setUser(currentUser);
        } else {
          await signOut(auth);
          alert('عذراً، هذا الحساب غير مصرح له بالدخول للوحة الإدارة.');
          setUser(null);
        }
      } else {
        setUser(null);
      }
    });

    return () => {
      window.removeEventListener('hashchange', checkHash);
      unsubscribe();
    };
  }, []);

  // Fetch leads when admin is authenticated
  useEffect(() => {
    if (!user) return;

    const q = query(collection(db, 'leads'), orderBy('createdAt', 'desc'));
    const unsubscribeLeads = onSnapshot(q, (snapshot) => {
      const items: Lead[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...(docSnap.data() as any)
      }));
      setLeads(items);
    }, (error) => {
      console.warn("Leads fetch notice:", error);
    });

    return () => unsubscribeLeads();
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Admin Login error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsOpen(false);
    } catch (error) {
      console.error("Admin Logout error:", error);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSelectedFile(null);
    setPreviewUrl('');
    setCompressedDataUrl('');
    setCompressedBlob(null);
    setCompressionInfo(null);
    setUploadStatusText('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setIsCompressing(true);
    setCompressionInfo(null);

    try {
      // Compress in browser: max 1280px dimension, web-optimal WebP/JPEG
      const result: CompressionResult = await compressImage(file, 1280, 0.8);
      setCompressedDataUrl(result.dataUrl);
      setCompressedBlob(result.blob);
      const savings = Math.max(0, Math.round(((result.originalSizeKb - result.compressedSizeKb) / result.originalSizeKb) * 100));
      setCompressionInfo({
        originalSizeKb: result.originalSizeKb,
        compressedSizeKb: result.compressedSizeKb,
        savingsPercent: savings,
      });
    } catch (err) {
      console.warn("Client compression warning, will use direct fallback:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadImage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !category || (!selectedFile && !compressedDataUrl)) return;

    setIsUploading(true);
    setUploadStatusText('جاري تجهيز الصورة...');

    try {
      let finalImageUrl = compressedDataUrl;
      let blobToUpload = compressedBlob;

      // If compression was still in progress or failed, compress now
      if (!finalImageUrl && selectedFile) {
        setUploadStatusText('جاري ضغط وتقليل حجم الصورة...');
        const res = await compressImage(selectedFile, 1280, 0.8);
        finalImageUrl = res.dataUrl;
        blobToUpload = res.blob;
      }

      // Try Firebase Storage with a strict 3.5s timeout; fallback instantly to high-quality compressed Base64
      if (storage && blobToUpload) {
        try {
          setUploadStatusText('جاري رفع الصورة...');
          const uploadPromise = (async () => {
            const fileName = `gallery/${Date.now()}_${Math.random().toString(36).substring(7)}.webp`;
            const storageRef = ref(storage, fileName);
            const uploadResult = await uploadBytes(storageRef, blobToUpload);
            return await getDownloadURL(uploadResult.ref);
          })();

          const timeoutPromise = new Promise<string>((_, reject) =>
            setTimeout(() => reject(new Error('Storage upload timeout')), 3500)
          );

          finalImageUrl = await Promise.race([uploadPromise, timeoutPromise]);
        } catch (storageErr) {
          console.warn("Storage upload bypassed or timed out, saving directly to Firestore (fast):", storageErr);
          // finalImageUrl remains compressedDataUrl which fits safely in Firestore rules
        }
      }

      setUploadStatusText('جاري الحفظ في المعرض...');
      await addDoc(collection(db, 'gallery'), {
        title: title.trim(),
        category,
        image: finalImageUrl || previewUrl,
        createdAt: serverTimestamp()
      });

      resetForm();
      alert("تمت إضافة الصورة إلى المعرض بنجاح وبسرعة فائقة!");
      setIsOpen(false);
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(`حدث خطأ أثناء الرفع والحفظ: ${error?.message || 'يرجى المحاولة مرة أخرى'}`);
    } finally {
      setIsUploading(false);
      setUploadStatusText('');
    }
  };

  const handleUpdateLeadStatus = async (leadId: string, newStatus: 'new' | 'contacted' | 'closed') => {
    try {
      await updateDoc(doc(db, 'leads', leadId), { status: newStatus });
    } catch (error) {
      console.error("Update lead status error:", error);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!window.confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await deleteDoc(doc(db, 'leads', leadId));
    } catch (error) {
      console.error("Delete lead error:", error);
    }
  };

  if (!user) {
    if (!showLoginTrigger) return null;
    return (
      <div className="fixed bottom-24 right-6 z-40">
        <button 
          onClick={handleLogin} 
          className="bg-gray-900 text-white p-3 rounded-full shadow-2xl hover:bg-[#143d6a] transition-all flex items-center gap-2 text-xs font-bold" 
          title="تسجيل دخول لوحة الإدارة"
          aria-label="تسجيل دخول لوحة تحكم شركة الأمين"
        >
          <LogIn size={18} />
          <span>دخول الإدارة</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-24 right-6 z-40 flex flex-col items-end gap-3 text-right">
      {/* Admin Floating Pill */}
      <div className="flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-full shadow-2xl border border-gray-200">
        <button 
          onClick={() => setIsOpen(!isOpen)} 
          className="bg-[#143d6a] text-white px-4 py-2 rounded-full font-bold text-xs sm:text-sm hover:bg-[#f39c12] transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Settings size={16} />
          <span>لوحة الإدارة ({leads.filter(l => l.status === 'new').length} جديد)</span>
        </button>

        <button 
          onClick={handleLogout} 
          className="bg-red-50 text-red-600 p-2 rounded-full hover:bg-red-600 hover:text-white transition-colors"
          title="تسجيل خروج"
          aria-label="تسجيل خروج الإدارة"
        >
          <LogOut size={16} />
        </button>
      </div>

      {/* Main Admin Drawer/Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="bg-white rounded-3xl shadow-2xl w-[92vw] sm:w-[480px] max-h-[80vh] flex flex-col overflow-hidden border border-gray-200"
          >
            {/* Modal Header */}
            <div className="p-4 bg-[#143d6a] text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">لوحة تحكم الأمين للبرجولات</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono">
                  {user.email}
                </span>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                aria-label="إغلاق لوحة التحكم"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-gray-200 bg-slate-50 p-2 gap-2">
              <button
                onClick={() => setActiveTab('gallery')}
                className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'gallery'
                    ? "bg-[#143d6a] text-white shadow-xs"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                <ImagePlus size={16} />
                <span>إضافة للمشروعات</span>
              </button>
              <button
                onClick={() => setActiveTab('leads')}
                className={`flex-1 py-2 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors ${
                  activeTab === 'leads'
                    ? "bg-[#143d6a] text-white shadow-xs"
                    : "text-gray-600 hover:bg-white"
                }`}
              >
                <Users size={16} />
                <span>طلبات العملاء ({leads.length})</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-5 overflow-y-auto flex-1">
              {activeTab === 'gallery' ? (
                <form onSubmit={handleUploadImage} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اسم ووصف العمل *</label>
                    <input 
                      type="text" 
                      value={title} 
                      onChange={e => setTitle(e.target.value)} 
                      required 
                      placeholder="مثال: برجولة خشب عزيزي هرمية بالتجمع" 
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[#f39c12]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">القسم</label>
                    <select 
                      value={category} 
                      onChange={e => setCategory(e.target.value)} 
                      className="w-full bg-slate-50 border border-gray-200 rounded-xl p-3 text-xs outline-none focus:border-[#f39c12]"
                    >
                      <option value="برجولات حدائق">برجولات حدائق</option>
                      <option value="برجولات روف">برجولات روف</option>
                      <option value="أسقف ديكورية">أسقف ديكورية</option>
                      <option value="أعمال خشبية">أعمال خشبية</option>
                      <option value="ديكورات خشبية">ديكورات خشبية</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">اختيار ملف الصورة *</label>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileSelect} 
                      required={!previewUrl}
                      disabled={isUploading}
                      className="w-full text-xs text-gray-600 file:ml-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#143d6a] file:text-white hover:file:bg-[#f39c12] file:cursor-pointer" 
                    />
                  </div>

                  {/* Compression Progress & Size Reduction Badge */}
                  {isCompressing && (
                    <div className="bg-amber-50 text-amber-800 text-[11px] p-3 rounded-xl flex items-center gap-2 border border-amber-200">
                      <Loader2 className="animate-spin text-[#f39c12]" size={15} />
                      <span className="font-bold">جاري ضغط الصورة وتجهيزها بأعلى جودة وأخف حجم...</span>
                    </div>
                  )}

                  {compressionInfo && !isCompressing && (
                    <div className="bg-emerald-50 text-emerald-800 text-[11px] p-2.5 rounded-xl flex items-center justify-between border border-emerald-200">
                      <div className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <span>
                          الحجم: {compressionInfo.originalSizeKb > 1024 ? `${(compressionInfo.originalSizeKb / 1024).toFixed(1)} MB` : `${compressionInfo.originalSizeKb} KB`} ➔ {compressionInfo.compressedSizeKb} KB
                        </span>
                      </div>
                      <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-black text-[10px] shrink-0">
                        وفر {compressionInfo.savingsPercent}% (رفع فوري)
                      </span>
                    </div>
                  )}

                  {previewUrl && (
                    <div className="relative rounded-xl overflow-hidden h-40 border border-gray-200 bg-black/5 group">
                      <img src={previewUrl} alt="معاينة العمل" className="w-full h-full object-cover" />
                      {!isUploading && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFile(null);
                            setPreviewUrl('');
                            setCompressedDataUrl('');
                            setCompressedBlob(null);
                            setCompressionInfo(null);
                          }}
                          className="absolute top-2 left-2 bg-black/70 hover:bg-red-600 text-white p-1.5 rounded-full transition-colors cursor-pointer"
                          title="إلغاء واختيار صورة أخرى"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  )}

                  <button 
                    type="submit" 
                    disabled={isUploading || isCompressing || !title.trim() || (!selectedFile && !compressedDataUrl)} 
                    className="w-full bg-[#f39c12] text-white py-3.5 rounded-xl font-bold text-sm hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer shadow-md"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>{uploadStatusText || 'جاري الرفع والحفظ...'}</span>
                      </>
                    ) : isCompressing ? (
                      <>
                        <Loader2 className="animate-spin" size={16} />
                        <span>جاري تجهيز الصورة للرفع...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={16} />
                        <span>نشر الصورة في المعرض الآن (فوري)</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-3">
                  {leads.length === 0 ? (
                    <div className="text-center py-10 text-gray-400 text-xs">
                      لا توجد طلبات عملاء حتى الآن. ستظهر هنا فور إرسال أي عميل للنموذج.
                    </div>
                  ) : (
                    leads.map((lead) => (
                      <div 
                        key={lead.id} 
                        className={`p-4 rounded-2xl border transition-all ${
                          lead.status === 'new' 
                            ? 'bg-amber-50/50 border-amber-200' 
                            : lead.status === 'contacted'
                            ? 'bg-blue-50/40 border-blue-100'
                            : 'bg-slate-50 border-gray-200 opacity-70'
                        }`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="font-black text-[#143d6a] text-sm block">{lead.name}</span>
                            <span className="text-[11px] text-gray-500">{lead.service}</span>
                          </div>
                          
                          <select
                            value={lead.status || 'new'}
                            onChange={(e) => handleUpdateLeadStatus(lead.id!, e.target.value as any)}
                            className="text-[11px] font-bold rounded-lg border border-gray-300 px-2 py-1 bg-white outline-none"
                          >
                            <option value="new">🔴 جديد</option>
                            <option value="contacted">🟡 تم التواصل</option>
                            <option value="closed">🟢 منتهي</option>
                          </select>
                        </div>

                        {lead.message && (
                          <p className="text-xs text-gray-600 bg-white p-2.5 rounded-xl border border-gray-100 mb-3 leading-relaxed">
                            "{lead.message}"
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-xs">
                          <div className="flex gap-2">
                            <a
                              href={`tel:${lead.phone}`}
                              className="bg-[#143d6a] text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold"
                            >
                              <Phone size={12} />
                              <span>{lead.phone}</span>
                            </a>
                            <a
                              href={`https://wa.me/2${lead.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-green-600 text-white px-2.5 py-1 rounded-lg flex items-center gap-1 font-bold"
                            >
                              <MessageCircle size={12} />
                              <span>واتساب</span>
                            </a>
                          </div>

                          <button
                            onClick={() => handleDeleteLead(lead.id!)}
                            className="text-red-500 hover:text-red-700 p-1"
                            title="حذف الطلب"
                            aria-label="حذف طلب العميل"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
